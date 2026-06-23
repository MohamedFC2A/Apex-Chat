/**
 * FIRESTORE TYPE DEFINITIONS
 * Strict typing for all Firestore collections
 * NO `any` types allowed
 */

import type { SubscriptionTier, AIModel, ServiceMode, Message } from "@shared/schema";

// ========== USER COLLECTION ==========
// Path: users/{uid}

export interface FirestoreUser {
    // Identity
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    
    // Subscription
    tier: SubscriptionTier;
    subscription: FirestoreSubscription;
    
    // Wallet
    wallet: FirestoreWallet;
    history: FirestoreTransaction[];
    
    // Metadata
    createdAt: number;
    updatedAt?: number;
    lastLoginAt?: string;
}

export interface FirestoreSubscription {
    active: boolean;
    startDate: string;    // ISO timestamp
    expiresAt: string;    // ISO timestamp
    autoRenew: boolean;
}

export interface FirestoreWallet {
    balance: number;
    currency: string;     // "USD"
}

export interface FirestoreTransaction {
    id: string;           // txn_{timestamp}_{random}
    date: string;         // ISO timestamp
    type: 'CREDIT_REDEEM' | 'PLAN_PURCHASE';
    amount: number;       // +ve for credit, -ve for purchase
    description: string;
}

// ========== VOUCHER COLLECTION ==========
// Path: vouchers/{docId}

export type VoucherStatus = 'active' | 'exhausted';

export interface FirestoreVoucher {
    code: string;           // Unique voucher code (e.g., "1977")
    amount: number;         // Credit amount to award (e.g., 200)
    maxUses: number;        // Maximum redemptions allowed
    usedBy: string[];       // Array of User UIDs who have claimed
    status: VoucherStatus;  // 'active' when available, 'exhausted' when maxUses reached
    
    // Audit trail
    createdAt?: string;     // ISO timestamp
    description?: string;
    lastRedeemedAt?: string;
    lastRedeemedBy?: string;
}

// Multi-use voucher creation helper
export interface CreateVoucherInput {
    code: string;
    amount: number;
    maxUses: number;
    description?: string;
}

// ========== CHAT COLLECTION ==========
// Path: users/{uid}/chats/{chatId}

export interface FirestoreChat {
    // Core data (mirrors Conversation type)
    id: string;
    title: string;
    messages: FirestoreChatMessage[];
    model: AIModel;
    mode: ServiceMode;
    createdAt: number;
    updatedAt: number;
    
    // Cloud metadata
    userId: string;
    syncedAt: string;       // ISO timestamp
    isDeleted: boolean;
    deletedAt?: string;     // ISO timestamp (if soft deleted)
}

export interface FirestoreChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model?: AIModel;
    reasoningContent?: string;
    timestamp: number;
}

// ========== HELPER TYPES ==========

// Firestore document paths
export type FirestorePath = 
    | `users/${string}`
    | `users/${string}/chats/${string}`
    | `vouchers/${string}`;

// Collection names
export type FirestoreCollection = 'users' | 'vouchers';
export type FirestoreSubcollection = 'chats';

// Type guards
export function isFirestoreVoucher(data: unknown): data is FirestoreVoucher {
    if (!data || typeof data !== 'object') return false;
    const v = data as FirestoreVoucher;
    return (
        typeof v.code === 'string' &&
        typeof v.amount === 'number' &&
        typeof v.maxUses === 'number' &&
        Array.isArray(v.usedBy) &&
        (v.status === 'active' || v.status === 'exhausted')
    );
}

export function isFirestoreUser(data: unknown): data is FirestoreUser {
    if (!data || typeof data !== 'object') return false;
    const u = data as FirestoreUser;
    return (
        typeof u.uid === 'string' &&
        typeof u.tier === 'string' &&
        typeof u.wallet === 'object'
    );
}

export function isFirestoreChat(data: unknown): data is FirestoreChat {
    if (!data || typeof data !== 'object') return false;
    const c = data as FirestoreChat;
    return (
        typeof c.id === 'string' &&
        typeof c.title === 'string' &&
        Array.isArray(c.messages) &&
        typeof c.userId === 'string'
    );
}

// ========== SEED DATA TYPES ==========

export interface VoucherSeedData {
    code: string;
    amount: number;
    maxUses: number;
    description: string;
}

export const MULTI_USE_VOUCHER_SEEDS: VoucherSeedData[] = [
    {
        code: "APEX_TWIN_50",
        amount: 50,
        maxUses: 2,
        description: "Twin Pack - $50 Credit (2 uses)"
    },
    {
        code: "DOUBLE_IMPACT_100",
        amount: 100,
        maxUses: 2,
        description: "Double Impact - $100 Credit (2 uses)"
    },
    {
        code: "GEMINI_DUO_75",
        amount: 75,
        maxUses: 2,
        description: "Gemini Duo - $75 Credit (2 uses)"
    }
];

