import { create } from "zustand";
import { supabase } from "./supabase";
import { useAuthStore } from "./auth-store";
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

function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function createWalletError(
    code: WalletErrorCode, 
    message: string, 
    recoverable = true
): WalletError {
    return { code, message, recoverable };
}

function parseSupabaseError(error: unknown): WalletError {
    const err = error as any;
    return createWalletError(
        'UNKNOWN',
        err?.message || 'An unexpected database error occurred.',
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
        if (!isOnline()) {
            const error = createWalletError('OFFLINE', 'Cannot add credit while offline.');
            set({ isLoading: false, error: error.message });
            return { success: false, newBalance: 0 };
        }
        
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
            // Get current profile
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (profileError || !profile) throw new Error("Profile not found");

            const currentWallet = profile.wallet || { balance: 0, currency: "USD" };
            const newBalance = (currentWallet.balance || 0) + amount;

            const transaction: TransactionHistoryItem = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: new Date().toISOString(),
                type: 'CREDIT_REDEEM',
                amount: amount,
                description: description,
            };

            const newWallet: UserWallet = {
                balance: newBalance,
                currency: 'USD',
            };

            const currentHistory = profile.history || [];

            // Update to Supabase
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    wallet: newWallet,
                    history: [transaction, ...currentHistory],
                })
                .eq("id", userId);

            if (updateError) throw updateError;

            // Update local state
            const authStore = useAuthStore.getState();
            authStore.updateWallet(newWallet);
            authStore.addTransaction(transaction);

            set({ isLoading: false });
            return { success: true, newBalance };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to add credit";
            set({ isLoading: false, error: errorMessage });
            return { success: false, newBalance: 0 };
        }
    },

    purchasePlan: async (tier, userId) => {
        if (!isOnline()) {
            const error = createWalletError('OFFLINE', 'Cannot purchase plan while offline.');
            set({ isLoading: false, error: error.message });
            return { success: false, message: error.message };
        }
        
        if (!userId) {
            return { success: false, message: 'User ID is required' };
        }
        if (!PLAN_PRICES[tier]) {
            return { success: false, message: `Invalid plan tier: ${tier}` };
        }
        
        set({ isLoading: true, error: null });

        try {
            // Get current profile
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (profileError || !profile) throw new Error("User profile not found");

            const currentBalance = profile.wallet?.balance || 0;
            const currentTier = profile.tier as SubscriptionTier || 'starter';
            const planPrice = PLAN_PRICES[tier];

            if (currentTier === tier) {
                throw new Error(`You are already subscribed to the ${getTierName(tier)} plan.`);
            }

            if (!canUpgradeToTier(currentTier, tier)) {
                throw new Error(`Cannot downgrade from ${getTierName(currentTier)} to ${getTierName(tier)}. You can only upgrade to higher tiers.`);
            }

            if (currentBalance < planPrice) {
                throw new Error(`Insufficient funds. Balance: $${currentBalance}, Required: $${planPrice}`);
            }

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

            const currentHistory = profile.history || [];
            const newHistory = [newHistoryItem, ...currentHistory];

            // Update to Supabase
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    wallet: { balance: newBalance, currency: "USD" },
                    tier: tier,
                    subscription: {
                        active: true,
                        startDate: now.toISOString(),
                        expiresAt: expiresAt.toISOString(),
                        autoRenew: false,
                    },
                    history: newHistory
                })
                .eq("id", userId);

            if (updateError) throw updateError;

            // Sync state
            await get().syncWalletFromFirebase(userId);

            const { useSubscriptionStore } = await import("./subscription-store");
            useSubscriptionStore.getState().setTier(tier);

            set({ isLoading: false });
            return {
                success: true,
                message: `Successfully activated ${tier} tier!`
            };
        } catch (error) {
            console.error("Transaction failed:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            set({ isLoading: false, error: errorMessage });
            return { success: false, message: errorMessage };
        }
    },

    syncWalletFromFirebase: async (userId) => {
        if (!isOnline() || !userId) return;
        
        set({ isLoading: true, error: null });

        try {
            const { data: profile, error: fetchError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (fetchError) throw fetchError;

            if (profile && profile.wallet) {
                const authStore = useAuthStore.getState();
                authStore.updateWallet(profile.wallet as UserWallet);
            }

            set({ isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to sync wallet";
            set({ isLoading: false, error: errorMessage });
        }
    },

    clearError: () => set({ error: null }),
}));
