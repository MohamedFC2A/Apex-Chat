import { create } from "zustand";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuthStore, DEFAULT_WALLET, DEFAULT_SUBSCRIPTION } from "./auth-store";
import type {
    SubscriptionTier,
    UserWallet,
    UserSubscription,
    TransactionHistoryItem,
} from "@shared/schema";
import { PlanPrices as PLAN_PRICES } from "@shared/schema";

// ========== TYPE DEFINITIONS ==========

export interface WalletOperationResult {
    success: boolean;
    message?: string;
    newBalance?: number;
    error?: WalletError;
}

export type WalletErrorCode = 
    | 'OFFLINE'
    | 'INSUFFICIENT_FUNDS'
    | 'INVALID_TIER'
    | 'DOWNGRADE_BLOCKED'
    | 'USER_NOT_FOUND'
    | 'TRANSACTION_FAILED'
    | 'SYNC_FAILED'
    | 'UNKNOWN';

export interface WalletError {
    code: WalletErrorCode;
    message: string;
    recoverable: boolean;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Check if the browser is currently online
 */
function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Create a standardized error object
 */
function createWalletError(
    code: WalletErrorCode, 
    message: string, 
    recoverable = true
): WalletError {
    return { code, message, recoverable };
}

/**
 * Parse Firebase error into wallet error
 */
function parseFirebaseError(error: unknown): WalletError {
    if (typeof error === 'string') {
        return createWalletError('TRANSACTION_FAILED', error, true);
    }
    
    const err = error as any;
    
    // Offline errors
    if (
        err?.code === 'unavailable' ||
        err?.code === 'failed-precondition' ||
        err?.message?.includes('offline') ||
        err?.message?.includes('client is offline')
    ) {
        return createWalletError(
            'OFFLINE',
            'You appear to be offline. Please check your connection and try again.',
            true
        );
    }
    
    // User not found
    if (err?.message?.includes('User document not found')) {
        return createWalletError('USER_NOT_FOUND', 'User account not found.', false);
    }
    
    return createWalletError(
        'UNKNOWN',
        err?.message || 'An unexpected error occurred.',
        true
    );
}

// TIER HIERARCHY SYSTEM (Prevents Downgrades)
const TIER_RANKS: Record<SubscriptionTier, number> = {
    starter: 0,
    pro: 1,
    elite: 2,
    omni: 3,
};

function canUpgradeToTier(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
    return TIER_RANKS[targetTier] > TIER_RANKS[currentTier];
}

function getTierName(tier: SubscriptionTier): string {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
}

interface WalletStore {
    // State
    isLoading: boolean;
    error: string | null;

    // Actions
    addCredit: (amount: number, description: string, userId: string) => Promise<{ success: boolean; newBalance: number }>;
    purchasePlan: (tier: SubscriptionTier, userId: string) => Promise<{ success: boolean; message: string }>;
    syncWalletFromFirebase: (userId: string) => Promise<void>;
    clearError: () => void;
}

export const useWalletStore = create<WalletStore>()((set, get) => ({
    isLoading: false,
    error: null,

    addCredit: async (amount, description, userId) => {
        // Pre-flight check: Are we online?
        if (!isOnline()) {
            const error = createWalletError('OFFLINE', 'Cannot add credit while offline.');
            set({ isLoading: false, error: error.message });
            return { success: false, newBalance: 0 };
        }
        
        // Input validation
        if (!userId) {
            set({ error: 'User ID is required' });
            return { success: false, newBalance: 0 };
        }
        if (amount <= 0) {
            set({ error: 'Amount must be greater than zero' });
            return { success: false, newBalance: 0 };
        }
        
        set({ isLoading: true, error: null });

        try {
            const authStore = useAuthStore.getState();
            const currentBalance = authStore.user?.wallet.balance || 0;
            const newBalance = currentBalance + amount;

            // Create transaction record
            const transaction: TransactionHistoryItem = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: new Date().toISOString(),
                type: 'CREDIT_REDEEM',
                amount: amount,
                description: description,
            };

            // Update local state
            const newWallet: UserWallet = {
                balance: newBalance,
                currency: 'USD',
            };
            authStore.updateWallet(newWallet);
            authStore.addTransaction(transaction);

            // Sync to Firebase
            const userDocRef = doc(db, "users", userId);
            const currentHistory = authStore.user?.history || [];
            await setDoc(userDocRef, {
                wallet: newWallet,
                history: [transaction, ...currentHistory],
            }, { merge: true });

            set({ isLoading: false });
            return { success: true, newBalance };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to add credit";
            set({ isLoading: false, error: errorMessage });
            return { success: false, newBalance: 0 };
        }
    },

    purchasePlan: async (tier, userId) => {
        // Pre-flight check: Are we online?
        if (!isOnline()) {
            const error = createWalletError('OFFLINE', 'Cannot purchase plan while offline.');
            set({ isLoading: false, error: error.message });
            return { success: false, message: error.message };
        }
        
        // Input validation
        if (!userId) {
            return { success: false, message: 'User ID is required' };
        }
        if (!PLAN_PRICES[tier]) {
            return { success: false, message: `Invalid plan tier: ${tier}` };
        }
        
        set({ isLoading: true, error: null });

        try {
            const { runTransaction } = await import("firebase/firestore");
            const userDocRef = doc(db, "users", userId);
            const planPrice = PLAN_PRICES[tier];

            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userDocRef);
                if (!docSnap.exists()) throw "User document not found";

                const userData = docSnap.data();
                const currentBalance = userData.wallet?.balance || 0;
                const currentTier = userData.tier as SubscriptionTier || 'starter';

                // 1. ATOMIC VALIDATION
                if (currentTier === tier) {
                    throw `You are already subscribed to the ${getTierName(tier)} plan.`;
                }

                // CRITICAL: Prevent Downgrades
                if (!canUpgradeToTier(currentTier, tier)) {
                    throw `Cannot downgrade from ${getTierName(currentTier)} to ${getTierName(tier)}. You can only upgrade to higher tiers.`;
                }

                if (currentBalance < planPrice) {
                    throw `Insufficient funds. Balance: $${currentBalance}, Required: $${planPrice}`;
                }

                // 2. CALCULATIONS
                const newBalance = currentBalance - planPrice;
                const now = new Date();
                const expiresAt = new Date(now);
                expiresAt.setMonth(expiresAt.getMonth() + 1);

                const newHistoryItem: TransactionHistoryItem = {
                    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    date: now.toISOString(),
                    type: 'PLAN_PURCHASE',
                    amount: -planPrice,
                    description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan Purchase`,
                };

                const currentHistory = userData.history || [];
                const newHistory = [newHistoryItem, ...currentHistory];

                // 3. ATOMIC COMMIT
                transaction.update(userDocRef, {
                    "wallet.balance": newBalance,
                    "tier": tier,
                    "subscription.active": true,
                    "subscription.startDate": now.toISOString(),
                    "subscription.expiresAt": expiresAt.toISOString(),
                    "history": newHistory
                });

                // 4. INSTANT LOCAL SYNC (Inside transaction scope for safety, but state update happens after)
            });

            // 5. POST-COMMIT STATE UPDATE (Instant UX)
            // Use get() to access current state for other properties, but override what we just changed
            const authStore = useAuthStore.getState();

            // Re-fetch strictly just to be safe OR optimistically update
            // We'll optimistically update based on our known calculation
            await useWalletStore.getState().syncWalletFromFirebase(userId);

            // Also force subscription store update
            const { useSubscriptionStore } = await import("./subscription-store");
            useSubscriptionStore.getState().setTier(tier);

            set({ isLoading: false });
            return {
                success: true,
                message: `Successfully activated ${tier} tier!`
            };
        } catch (error) {
            console.error("Transaction failed:", error);
            const errorMessage = typeof error === 'string' ? error : (error as Error).message;
            set({ isLoading: false, error: errorMessage });
            return { success: false, message: errorMessage };
        }
    },

    syncWalletFromFirebase: async (userId) => {
        // Skip sync if offline
        if (!isOnline()) {
            console.warn('[WalletStore] Skipping sync - offline');
            return;
        }
        
        if (!userId) {
            console.warn('[WalletStore] Skipping sync - no userId');
            return;
        }
        
        set({ isLoading: true, error: null });

        try {
            const userDocRef = doc(db, "users", userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                const authStore = useAuthStore.getState();

                // Update wallet if exists
                if (data.wallet) {
                    authStore.updateWallet(data.wallet as UserWallet);
                }
            }

            set({ isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to sync wallet";
            set({ isLoading: false, error: errorMessage });
        }
    },

    clearError: () => set({ error: null }),
}));
