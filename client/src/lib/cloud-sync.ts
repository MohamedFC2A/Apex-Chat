/**
 * CLOUD SYNC SERVICE (SUPABASE VERSION)
 * Handles real-time synchronization of chat conversations to Supabase Postgres
 * localStorage serves as temporary cache, Supabase is source of truth
 */

import { supabase } from "./supabase";
import type { Conversation } from "@shared/schema";

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
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Parse Supabase error into sync error
 */
function parseSupabaseError(error: any): SyncError {
    if (error?.code === 'PGRST116' || error?.code === '42501') {
        syncState.permissionDenied = true;
        return {
            code: 'PERMISSION_DENIED',
            message: 'Database permission denied. Please check auth state.',
            fallbackToLocal: true,
            userFriendlyMessage: '🔒 Access Refused. Please check your credentials.'
        };
    }
    
    if (!syncState.isOnline) {
        return {
            code: 'OFFLINE',
            message: 'You are offline.',
            fallbackToLocal: true,
            userFriendlyMessage: '📡 Offline Mode - Using local storage'
        };
    }

    return {
        code: 'UNKNOWN',
        message: error?.message || 'Unknown database error',
        fallbackToLocal: true,
        userFriendlyMessage: '⚠️ Sync temporarily unavailable - Using local storage'
    };
}

function shouldAttemptSync(): boolean {
    return syncState.isOnline && !syncState.permissionDenied;
}

/**
 * SAVE SINGLE CONVERSATION TO CLOUD
 */
export async function saveConversation(userId: string, conversation: Conversation): Promise<void> {
    if (!userId || !conversation.id) return;
    if (!shouldAttemptSync()) return;

    try {
        syncState.isSyncing = true;
        syncState.syncError = null;

        const { error } = await supabase.from("conversations").upsert({
            id: conversation.id,
            user_id: userId,
            title: conversation.title,
            messages: conversation.messages,
            model: conversation.model,
            mode: conversation.mode,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
            is_deleted: false,
        });

        if (error) throw error;

        syncState.lastSyncAt = new Date().toISOString();
        syncState.permissionDenied = false;
    } catch (error) {
        const syncError = parseSupabaseError(error);
        console.warn(`[CloudSync] Save failed (${syncError.code}):`, syncError.message);
        syncState.syncError = syncError.userFriendlyMessage;
    } finally {
        syncState.isSyncing = false;
    }
}

/**
 * DELETE CONVERSATION FROM CLOUD
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
    if (!userId || !conversationId) return;
    if (!shouldAttemptSync()) return;

    try {
        const { error } = await supabase.from("conversations").update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
        }).eq("id", conversationId).eq("user_id", userId);

        if (error) throw error;
    } catch (error) {
        const syncError = parseSupabaseError(error);
        console.warn(`[CloudSync] Delete failed (${syncError.code}):`, syncError.message);
    }
}

/**
 * FETCH ALL CHATS FROM CLOUD
 */
export async function fetchConversationsFromCloud(userId: string): Promise<Conversation[]> {
    if (!userId) return [];
    if (!shouldAttemptSync()) return [];

    try {
        syncState.isSyncing = true;

        const { data, error } = await supabase
            .from("conversations")
            .select("*")
            .eq("user_id", userId)
            .eq("is_deleted", false)
            .order("updated_at", { ascending: false })
            .limit(100);

        if (error) throw error;

        const conversations: Conversation[] = (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            messages: row.messages,
            model: row.model,
            mode: row.mode,
            createdAt: Number(row.created_at),
            updatedAt: Number(row.updated_at),
        }));

        syncState.lastSyncAt = new Date().toISOString();
        syncState.syncError = null;
        syncState.permissionDenied = false;

        return conversations;
    } catch (error) {
        const syncError = parseSupabaseError(error);
        console.warn(`[CloudSync] Fetch failed (${syncError.code}):`, syncError.message);
        syncState.syncError = syncError.userFriendlyMessage;
        return [];
    } finally {
        syncState.isSyncing = false;
    }
}

/**
 * BATCH SYNC ALL LOCAL CHATS TO CLOUD
 */
export async function syncConversationsToCloud(userId: string, conversations: Conversation[]): Promise<void> {
    if (!userId || conversations.length === 0) return;
    if (!shouldAttemptSync()) return;

    try {
        syncState.isSyncing = true;
        syncState.pendingChanges = conversations.length;

        const records = conversations.map((conv) => ({
            id: conv.id,
            user_id: userId,
            title: conv.title,
            messages: conv.messages,
            model: conv.model,
            mode: conv.mode,
            created_at: conv.createdAt,
            updated_at: conv.updatedAt,
            is_deleted: false,
        }));

        const { error } = await supabase.from("conversations").upsert(records);
        if (error) throw error;

        syncState.lastSyncAt = new Date().toISOString();
        syncState.pendingChanges = 0;
        syncState.syncError = null;
        syncState.permissionDenied = false;
    } catch (error) {
        const syncError = parseSupabaseError(error);
        console.warn(`[CloudSync] Batch sync failed (${syncError.code}):`, syncError.message);
        syncState.syncError = syncError.userFriendlyMessage;
    } finally {
        syncState.isSyncing = false;
    }
}

/**
 * SUBSCRIBE TO REAL-TIME UPDATES
 */
export function subscribeToConversations(
    userId: string, 
    onUpdate: (conversations: Conversation[]) => void
): () => void {
    if (!userId) return () => {};
    if (!shouldAttemptSync()) return () => {};

    // Initial load
    fetchConversationsFromCloud(userId).then(onUpdate);

    // Setup realtime subscription channel
    const channel = supabase
        .channel(`conversations-channel-${userId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "conversations",
                filter: `user_id=eq.${userId}`,
            },
            async () => {
                const refreshed = await fetchConversationsFromCloud(userId);
                onUpdate(refreshed);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                syncState.permissionDenied = false;
                syncState.syncError = null;
            }
        });

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * DEBOUNCED SAVE
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

export function getSyncState(): SyncState {
    return { ...syncState };
}

export async function forceSyncNow(userId: string): Promise<void> {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
    }
    
    const { useChatStore } = await import("./store");
    const conversations = useChatStore.getState().conversations;
    
    await syncConversationsToCloud(userId, conversations);
}

export function mergeConversations(
    local: Conversation[], 
    cloud: Conversation[]
): Conversation[] {
    const merged = new Map<string, Conversation>();

    cloud.forEach((conv) => merged.set(conv.id, conv));

    local.forEach((localConv) => {
        const cloudConv = merged.get(localConv.id);
        if (!cloudConv || localConv.updatedAt > cloudConv.updatedAt) {
            merged.set(localConv.id, localConv);
        }
    });

    return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

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
