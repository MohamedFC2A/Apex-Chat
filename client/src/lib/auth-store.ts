import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { SubscriptionTier, UserWallet, UserSubscription, TransactionHistoryItem } from "@shared/schema";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  tier: SubscriptionTier;
  createdAt: number;
  // Wallet System
  wallet: UserWallet;
  subscription: UserSubscription;
  history: TransactionHistoryItem[];
}

// Default wallet values for new/existing users
export const DEFAULT_WALLET: UserWallet = {
  balance: 0,
  currency: 'USD',
};

export const DEFAULT_SUBSCRIPTION: UserSubscription = {
  active: false,
  startDate: '',
  expiresAt: '',
  autoRenew: false,
};

interface AuthStore {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (supabaseUser: SupabaseUser | null, tier?: SubscriptionTier, walletData?: Partial<{ wallet: UserWallet; subscription: UserSubscription; history: TransactionHistoryItem[] }>) => void;
  updateTier: (tier: SubscriptionTier) => void;
  updateWallet: (wallet: UserWallet) => void;
  addTransaction: (transaction: TransactionHistoryItem) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,

      setUser: (supabaseUser, tier = "omni", walletData) => {
        if (!supabaseUser) {
          set({ user: null, isLoading: false });
          return;
        }

        const userProfile: UserProfile = {
          uid: supabaseUser.id,
          email: supabaseUser.email || null,
          displayName: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name || null,
          photoURL: supabaseUser.user_metadata?.avatar_url || null,
          tier: "omni",
          createdAt: Date.now(),
          wallet: walletData?.wallet || DEFAULT_WALLET,
          subscription: walletData?.subscription || DEFAULT_SUBSCRIPTION,
          history: walletData?.history || [],
        };

        set({ user: userProfile, isLoading: false });
      },

      updateTier: (tier) =>
        set((state) => ({
          user: state.user ? { ...state.user, tier: "omni" } : null,
        })),

      updateWallet: (wallet) =>
        set((state) => ({
          user: state.user ? { ...state.user, wallet } : null,
        })),

      addTransaction: (transaction) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, history: [transaction, ...state.user.history] }
            : null,
        })),

      logout: () => set({ user: null, isLoading: false }),
    }),
    {
      name: "apex-auth-storage",
    }
  )
);
