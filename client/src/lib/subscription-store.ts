import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubscriptionTier, AIModel, Voucher } from "@shared/schema";
import { MODELS, MODEL_TIER_MAP } from "@/lib/constants";
import { supabase } from "./supabase";

interface SubscriptionStore {
    tier: SubscriptionTier;
    setTier: (tier: SubscriptionTier) => void;
    redeemVoucher: (code: string) => Promise<{ success: boolean; message: string; tier?: SubscriptionTier }>;
    getAvailableModels: () => AIModel[];
    canAccessModel: (model: AIModel) => boolean;
    canUseDeepResearch: () => boolean;
    canUseGodMode: () => boolean;
}

const modelTierMap: Record<AIModel, SubscriptionTier> = MODEL_TIER_MAP;
const allModels: AIModel[] = MODELS;
const tierHierarchy = { starter: 0, pro: 1, elite: 2, omni: 3 };

export const useSubscriptionStore = create<SubscriptionStore>()(
    persist(
        (set, get) => ({
            tier: "omni", // Temporarily forced to highest tier

            setTier: (tier) => set({ tier: "omni" }),

            redeemVoucher: async (code) => {
                try {
                    const { useAuthStore } = await import("./auth-store");
                    const user = useAuthStore.getState().user;

                    if (!user) {
                        return {
                            success: false,
                            message: "Please sign in to redeem codes.",
                        };
                    }

                    const normalizedCode = String(code).trim().toUpperCase();
                    if (!normalizedCode) {
                        return {
                            success: false,
                            message: "Please enter a voucher code.",
                        };
                    }

                    // Query the voucher
                    const { data: voucherData, error: fetchError } = await supabase
                        .from("vouchers")
                        .select("*")
                        .eq("code", normalizedCode)
                        .single();

                    if (fetchError || !voucherData) {
                        return {
                            success: false,
                            message: "Invalid voucher code. Please check and try again.",
                        };
                    }

                    if (voucherData.status === "exhausted") {
                        return {
                            success: false,
                            message: "This voucher has reached its maximum usage limit.",
                        };
                    }

                    const usedByArray = voucherData.used_by || [];
                    if (usedByArray.includes(user.uid)) {
                        return {
                            success: false,
                            message: "You have already redeemed this voucher.",
                        };
                    }

                    // Get user profile
                    const { data: profile, error: profileError } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", user.uid)
                        .single();

                    if (profileError || !profile) {
                        return {
                            success: false,
                            message: "User profile not found.",
                        };
                    }

                    const maxUses = voucherData.max_uses || 1;
                    const redeemedAmount = voucherData.amount;
                    const currentWallet = profile.wallet || { balance: 0, currency: "USD" };
                    const newBalance = (currentWallet.balance || 0) + redeemedAmount;
                    const remainingUses = maxUses - (usedByArray.length + 1);

                    const transactionRecord = {
                        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        date: new Date().toISOString(),
                        type: 'CREDIT_REDEEM',
                        amount: redeemedAmount,
                        description: `Redeemed Code ${normalizedCode}`,
                    };

                    const currentHistory = profile.history || [];
                    const isExhausted = (usedByArray.length + 1) >= maxUses;

                    // Update voucher
                    const newUsedBy = [...usedByArray, user.uid];
                    const { error: voucherUpdateError } = await supabase
                        .from("vouchers")
                        .update({
                            used_by: newUsedBy,
                            status: isExhausted ? "exhausted" : "active"
                        })
                        .eq("code", normalizedCode);

                    if (voucherUpdateError) throw voucherUpdateError;

                    // Update profile
                    const { error: profileUpdateError } = await supabase
                        .from("profiles")
                        .update({
                            wallet: { ...currentWallet, balance: newBalance },
                            history: [transactionRecord, ...currentHistory]
                        })
                        .eq("id", user.uid);

                    if (profileUpdateError) throw profileUpdateError;

                    // Sync local state
                    const { useWalletStore } = await import("./wallet-store");
                    await useWalletStore.getState().syncWalletFromFirebase(user.uid);

                    const successMessage = remainingUses > 0 
                        ? `Voucher redeemed! $${redeemedAmount} added. (${remainingUses} uses remaining)`
                        : `Voucher redeemed! $${redeemedAmount} added. (Last use - voucher exhausted)`;

                    return {
                        success: true,
                        message: successMessage,
                        type: 'credit',
                        amount: redeemedAmount,
                        newBalance: newBalance,
                        remainingUses: remainingUses,
                    };

                } catch (error) {
                    console.error("Voucher redemption failed:", error);
                    const errorMessage = typeof error === 'string' ? error : (error as Error).message || "Redemption failed";
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            getAvailableModels: () => {
                const currentTier = get().tier;
                const currentTierLevel = tierHierarchy[currentTier];

                return allModels.filter((model) => {
                    const requiredTier = modelTierMap[model];
                    const requiredLevel = tierHierarchy[requiredTier];
                    return currentTierLevel >= requiredLevel;
                });
            },

            canAccessModel: (model) => {
                const currentTier = get().tier;
                const requiredTier = modelTierMap[model];
                return tierHierarchy[currentTier] >= tierHierarchy[requiredTier];
            },

            canUseDeepResearch: () => {
                const currentTier = get().tier;
                return tierHierarchy[currentTier] >= tierHierarchy.pro;
            },

            canUseGodMode: () => {
                const currentTier = get().tier;
                return currentTier === "omni"; // Exclusive to Tier 4
            },
        }),
        {
            name: "apex-subscription-storage",
        }
    )
);
