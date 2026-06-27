/**
 * CLOUD SYNC SERVICE
 * Handles real-time synchronization of chat conversations to Firestore
 * localStorage serves as temporary cache, Firestore is source of truth
 * 
 * PATH: users/{uid}/chats/{chatId}
 */

import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit,
    onSnapshot,
    writeBatch,
    serverTimestamp,
    Timestamp,
    FirestoreError
} from "firebase/firestore";
import { db } from "./firebase";
import type { Conversation, Message, CloudConversation } from "@shared/schema";

// ========== TYPES ==========

export interface SyncState {
    lastSyncAt: string | null;
    isSyncing: boolean;
    syncError: string | null;
    pendingChanges: number;
    isOnline: boolean;
    permissionDenied: boolean;
}

export type SyncErrorCode = 
    | 'PERMISSION_DENIED'
    | 'OFFLINE'
    | 'NETWORK_ERROR'
    | 'INDEX_BUILDING'
    | 'UNKNOWN';

export interface SyncError {
    code: SyncErrorCode;
    message: string;
    fallbackToLocal: boolean;
    userFriendlyMessage: string;
}

export interface CloudSyncService {
    // Core sync operations
    syncConversationsToCloud: (userId: string, conversations: Conversation[]) => Promise<void>;
    fetchConversationsFromCloud: (userId: string) => Promise<Conversation[]>;
    
    // Real-time listeners
    subscribeToConversations: (userId: string, onUpdate: (conversations: Conversation[]) => void) => () => void;
    
    // Individual operations
    saveConversation: (userId: string, conversation: Conversation) => Promise<void>;
    deleteConversation: (userId: string, conversationId: string) => Promise<void>;
    
    // Utility
    getSyncState: () => SyncState;
    forceSyncNow: (userId: string) => Promise<void>;
}

// Sync state management
let syncState: SyncState = {
    lastSyncAt: null,
    isSyncing: false,
    syncError: null,
    pendingChanges: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    permissionDenied: false,
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncState.isOnline = true;
        syncState.syncError = null;
    });
    window.addEventListener('offline', () => {
        syncState.isOnline = false;
    });
}

// Debounce timer for batch syncs
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000; // Wait 2 seconds before syncing to batch writes

// ========== ERROR HANDLING ==========

/**
 * Parse Firestore error into sync error
 */
function parseFirestoreError(error: unknown): SyncError {
    const err = error as FirestoreError;
    
    // Index Building (failed-precondition)
    if (err?.code === 'failed-precondition') {
        // Check if it's specifically an index error
        if (err?.message?.includes('index') || err?.message?.includes('requires an index')) {
            return {
                code: 'INDEX_BUILDING',
                message: 'Firestore index is building. Please wait a few minutes.',
                fallbackToLocal: true,
                userFriendlyMessage: '🔧 System Optimizing... This may take a few minutes.'
            };
        }
    }
    
    // Permission Denied
    if (err?.code === 'permission-denied') {
        syncState.permissionDenied = true;
        return {
            code: 'PERMISSION_DENIED',
            message: 'Firestore permission denied. Please refresh your login.',
            fallbackToLocal: true,
            userFriendlyMessage: '🔒 Login Refresh Needed. Please sign out and sign back in.'
        };
    }
    
    // Offline errors
    if (
        err?.code === 'unavailable' ||
        err?.message?.includes('offline') ||
        err?.message?.includes('client is offline')
    ) {
        return {
            code: 'OFFLINE',
            message: 'You appear to be offline. Changes saved locally.',
            fallbackToLocal: true,
            userFriendlyMessage: '📡 Offline Mode - Changes saved locally'
        };
    }
    
    // Network errors
    if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        return {
            code: 'NETWORK_ERROR',
            message: 'Network error. Changes saved locally.',
            fallbackToLocal: true,
            userFriendlyMessage: '🌐 Network Issue - Using local storage'
        };
    }
    
    return {
        code: 'UNKNOWN',
        message: err?.message || 'Unknown sync error',
        fallbackToLocal: true,
        userFriendlyMessage: '⚠️ Sync temporarily unavailable - Using local storage'
    };
}

/**
 * Check if we should attempt cloud sync
 */
function shouldAttemptSync(): boolean {
    return syncState.isOnline && !syncState.permissionDenied;
}

/**
 * Convert local conversation to cloud format
 */
function toCloudConversation(conv: Conversation, userId: string): CloudConversation {
    // Strip out undefined values before saving to Firestore, as it throws on undefined fields
    const cleanConv = JSON.parse(JSON.stringify(conv));
    return {
        ...cleanConv,
        userId,
        syncedAt: new Date().toISOString(),
        isDeleted: false,
    };
}

/**
 * Convert cloud conversation to local format
 */
function fromCloudConversation(cloudConv: any): Conversation {
    const { userId, syncedAt, isDeleted, ...localConv } = cloudConv;
    return localConv as Conversation;
}

/**
 * Get collection reference for user's chats
 * PATH: users/{uid}/chats
 */
function getChatsRef(userId: string) {
    return collection(db, "users", userId, "chats");
}

/**
 * SAVE SINGLE CONVERSATION TO CLOUD
 * Used for real-time updates as user chats
 * PATH: users/{uid}/chats/{chatId}
 */
export async function saveConversation(userId: string, conversation: Conversation): Promise<void> {
    if (!userId || !conversation.id) {
        console.warn("[CloudSync] Invalid userId or conversation.id");
        return;
    }
    
    // Skip if we know we can't sync
    if (!shouldAttemptSync()) {
        console.warn("[CloudSync] Skipping save - offline or permission denied");
        return;
    }

    try {
        syncState.isSyncing = true;
        syncState.syncError = null;

        const chatRef = doc(db, "users", userId, "chats", conversation.id);
        const cloudConv = toCloudConversation(conversation, userId);

        await setDoc(chatRef, cloudConv, { merge: true });

        syncState.lastSyncAt = new Date().toISOString();
        syncState.permissionDenied = false; // Reset on success
    } catch (error) {
        const syncError = parseFirestoreError(error);
        console.warn(`[CloudSync] Save failed (${syncError.code}):`, syncError.message);
        syncState.syncError = syncError.message;
        
        // Don't throw - fail silently for UX, localStorage handles persistence
    } finally {
        syncState.isSyncing = false;
    }
}

/**
 * DELETE CONVERSATION FROM CLOUD
 * Soft delete with isDeleted flag for recovery option
 * PATH: users/{uid}/chats/{chatId}
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
    if (!userId || !conversationId) return;
    
    // Skip if we know we can't sync
    if (!shouldAttemptSync()) {
        return;
    }

    try {
        const chatRef = doc(db, "users", userId, "chats", conversationId);
        
        // Soft delete - mark as deleted but keep data
        await setDoc(chatRef, { 
            isDeleted: true, 
            deletedAt: new Date().toISOString() 
        }, { merge: true });

    } catch (error) {
        const syncError = parseFirestoreError(error);
        console.warn(`[CloudSync] Delete failed (${syncError.code}):`, syncError.message);
        // Fail silently - local delete still works
    }
}

/**
 * FETCH ALL CHATS FROM CLOUD
 * Used on app startup to restore user's chat history
 * PATH: users/{uid}/chats
 * 
 * CRITICAL: Query must match Firestore index:
 * - Collection: users/{uid}/chats
 * - Fields: isDeleted (==), updatedAt (desc)
 */
export async function fetchConversationsFromCloud(userId: string): Promise<Conversation[]> {
    if (!userId) return [];
    
    // Skip if we know we can't sync
    if (!shouldAttemptSync()) {
        console.warn("[CloudSync] Skipping fetch - offline or permission denied");
        return [];
    }

    try {
        syncState.isSyncing = true;
        
        const chatsRef = getChatsRef(userId);
        
        // Fetch all documents in the collection directly, no order or filters to avoid index errors
        const snapshot = await getDocs(chatsRef);
        const conversations: Conversation[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            // Filter deleted chats locally
            if (data && data.isDeleted !== true) {
                conversations.push(fromCloudConversation(data));
            }
        });

        // Sort in-memory: updatedAt Descending
        conversations.sort((a, b) => b.updatedAt - a.updatedAt);

        // Apply local limit of 100 chats
        const limitedConversations = conversations.slice(0, 100);

        syncState.lastSyncAt = new Date().toISOString();
        syncState.syncError = null;
        syncState.permissionDenied = false; // Reset on success

        return limitedConversations;

    } catch (error) {
        const syncError = parseFirestoreError(error);
        
        // Log with appropriate severity
        if (syncError.code === 'INDEX_BUILDING') {
            console.warn(`[CloudSync] ${syncError.userFriendlyMessage}`);
            console.warn('[CloudSync] Create index at: https://console.firebase.google.com/project/gen-lang-client-0258578294/firestore/indexes');
        } else if (syncError.code === 'PERMISSION_DENIED') {
            console.error(`[CloudSync] ${syncError.userFriendlyMessage}`);
        } else {
            console.warn(`[CloudSync] Fetch failed (${syncError.code}):`, syncError.message);
        }
        
        syncState.syncError = syncError.userFriendlyMessage;
        return []; // Return empty, let local cache handle it
    } finally {
        syncState.isSyncing = false;
    }
}

/**
 * BATCH SYNC ALL LOCAL CHATS TO CLOUD
 * Used for initial migration or force sync
 * PATH: users/{uid}/chats/{chatId}
 */
export async function syncConversationsToCloud(userId: string, conversations: Conversation[]): Promise<void> {
    if (!userId || conversations.length === 0) return;
    
    // Skip if we know we can't sync
    if (!shouldAttemptSync()) {
        console.warn("[CloudSync] Skipping batch sync - offline or permission denied");
        return;
    }

    try {
        syncState.isSyncing = true;
        syncState.pendingChanges = conversations.length;

        // Use batched writes for efficiency (max 500 per batch)
        const batchSize = 500;
        const batches = [];

        for (let i = 0; i < conversations.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = conversations.slice(i, i + batchSize);

            chunk.forEach((conv) => {
                const chatRef = doc(db, "users", userId, "chats", conv.id);
                batch.set(chatRef, toCloudConversation(conv, userId), { merge: true });
            });

            batches.push(batch.commit());
        }

        await Promise.all(batches);

        syncState.lastSyncAt = new Date().toISOString();
        syncState.pendingChanges = 0;
        syncState.syncError = null;
        syncState.permissionDenied = false;

    } catch (error) {
        const syncError = parseFirestoreError(error);
        console.warn(`[CloudSync] Batch sync failed (${syncError.code}):`, syncError.message);
        syncState.syncError = syncError.message;
    } finally {
        syncState.isSyncing = false;
    }
}

/**
 * SUBSCRIBE TO REAL-TIME UPDATES
 * Returns unsubscribe function
 * PATH: users/{uid}/chats
 * 
 * CRITICAL: Query must match Firestore index:
 * - Collection: users/{uid}/chats
 * - Fields: isDeleted (==), updatedAt (desc)
 */
export function subscribeToConversations(
    userId: string, 
    onUpdate: (conversations: Conversation[]) => void
): () => void {
    if (!userId) return () => {};
    
    // Skip if we know we can't sync
    if (!shouldAttemptSync()) {
        console.warn("[CloudSync] Skipping subscription - offline or permission denied");
        return () => {};
    }

    const chatsRef = getChatsRef(userId);
    
    const unsubscribe = onSnapshot(chatsRef, 
        (snapshot) => {
            const conversations: Conversation[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data && data.isDeleted !== true) {
                    conversations.push(fromCloudConversation(data));
                }
            });
            conversations.sort((a, b) => b.updatedAt - a.updatedAt);
            const limited = conversations.slice(0, 100);
            
            syncState.permissionDenied = false; // Reset on success
            syncState.lastSyncAt = new Date().toISOString();
            syncState.syncError = null;
            onUpdate(limited);
        },
        (error) => {
            const syncError = parseFirestoreError(error);
            
            // Graceful error handling - don't crash the app
            if (syncError.code === 'INDEX_BUILDING') {
                console.warn(`[CloudSync] ${syncError.userFriendlyMessage}`);
                console.warn('[CloudSync] Realtime sync paused. Using local data.');
                console.warn('[CloudSync] Create index at: https://console.firebase.google.com/project/gen-lang-client-0258578294/firestore/indexes');
            } else if (syncError.code === 'PERMISSION_DENIED') {
                console.error(`[CloudSync] ${syncError.userFriendlyMessage}`);
                console.error('[CloudSync] Check Firestore security rules.');
            } else {
                console.warn(`[CloudSync] Realtime listener error (${syncError.code}):`, syncError.message);
            }
            
            syncState.syncError = syncError.userFriendlyMessage;
            // Don't crash - just log the error and continue with local data
        }
    );

    return unsubscribe;
}

/**
 * DEBOUNCED SYNC
 * Batches multiple rapid changes into a single sync operation
 */
export function debouncedSaveConversation(userId: string, conversation: Conversation): void {
    syncState.pendingChanges++;

    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
    }

    syncDebounceTimer = setTimeout(() => {
        saveConversation(userId, conversation);
        syncDebounceTimer = null;
    }, SYNC_DEBOUNCE_MS);
}

/**
 * GET CURRENT SYNC STATE
 */
export function getSyncState(): SyncState {
    return { ...syncState };
}

/**
 * FORCE IMMEDIATE SYNC
 */
export async function forceSyncNow(userId: string): Promise<void> {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
    }
    
    // Import and get current conversations from local store
    const { useChatStore } = await import("./store");
    const conversations = useChatStore.getState().conversations;
    
    await syncConversationsToCloud(userId, conversations);
}

/**
 * MERGE CLOUD AND LOCAL CONVERSATIONS
 * Resolves conflicts using "last write wins" strategy
 */
export function mergeConversations(
    local: Conversation[], 
    cloud: Conversation[]
): Conversation[] {
    const merged = new Map<string, Conversation>();

    // Add all cloud conversations first
    cloud.forEach((conv) => merged.set(conv.id, conv));

    // Override with local if local is newer
    local.forEach((localConv) => {
        const cloudConv = merged.get(localConv.id);
        if (!cloudConv || localConv.updatedAt > cloudConv.updatedAt) {
            merged.set(localConv.id, localConv);
        }
    });

    // Sort by updatedAt descending
    return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

// Export the full service interface
export const cloudSyncService: CloudSyncService = {
    syncConversationsToCloud,
    fetchConversationsFromCloud,
    subscribeToConversations,
    saveConversation,
    deleteConversation,
    getSyncState,
    forceSyncNow,
};

export default cloudSyncService;

