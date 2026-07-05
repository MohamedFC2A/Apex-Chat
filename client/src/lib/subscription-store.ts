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
            tier: "omni",

            setTier: (tier) => set({ tier }),

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
                    let voucherData: any = null;
                    let fetchError: any = null;
                    try {
                        const { data, error } = await supabase
                            .from("vouchers")
                            .select("*")
                            .eq("code", normalizedCode)
                            .single();
                        voucherData = data;
                        fetchError = error;
                    } catch (e) {
                        fetchError = e;
                    }

                    // Fallback to local catalog of vouchers if database query returns empty or errors
                    if (fetchError || !voucherData) {
                        const mockCatalog: Record<string, { amount: number; max_uses: number; description: string }> = {
                            "2008": { amount: 150, max_uses: 999, description: "$150 Credit" },
                            "1977": { amount: 200, max_uses: 999, description: "$200 VIP Credit" },
                            "APEX_TWIN_50": { amount: 50, max_uses: 2, description: "Twin Pack - $50 Credit" },
                            "DOUBLE_IMPACT_100": { amount: 100, max_uses: 2, description: "Double Impact - $100 Credit" },
                            "GEMINI_DUO_75": { amount: 75, max_uses: 2, description: "Gemini Duo - $75 Credit" },
                            "STARTER_2025": { amount: 0, max_uses: 999, description: "Starter Tier Unlock" },
                            "DEEP_PRO_X": { amount: 0, max_uses: 999, description: "Pro Tier Unlock" },
                            "CHAOS_THEORY_100": { amount: 0, max_uses: 999, description: "Elite Tier Unlock" },
                            "OMNI_GENESIS_MAX": { amount: 0, max_uses: 999, description: "Omni Tier Unlock" },
                        };

                        if (mockCatalog[normalizedCode]) {
                            const mock = mockCatalog[normalizedCode];
                            voucherData = {
                                code: normalizedCode,
                                amount: mock.amount,
                                max_uses: mock.max_uses,
                                description: mock.description,
                                used_by: [],
                                status: "active"
                            };
                            fetchError = null;
                        }
                    }

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
                    let profile: any = user;
                    try {
                        const { data, error } = await supabase
                            .from("profiles")
                            .select("*")
                            .eq("id", user.uid)
                            .single();
                        if (data) profile = data;
                    } catch (e) {
                        console.warn("Could not fetch user profile from Supabase, using authStore state:", e);
                    }

                    const maxUses = voucherData.max_uses || 1;
                    const redeemedAmount = voucherData.amount;
                    const currentWallet = profile.wallet || { balance: 0, currency: "USD" };
                    const newBalance = (currentWallet.balance || 0) + redeemedAmount;
                    const remainingUses = maxUses - (usedByArray.length + 1);

                    const transactionRecord = {
                        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        date: new Date().toISOString(),
                        type: 'CREDIT_REDEEM' as const,
                        amount: redeemedAmount,
                        description: `Redeemed Code ${normalizedCode}`,
                    };

                    const currentHistory = profile.history || [];
                    const isExhausted = (usedByArray.length + 1) >= maxUses;

                    // Update local authStore state immediately (guarantees UI and ledger update immediately)
                    const updatedWallet = { ...currentWallet, balance: newBalance };
                    useAuthStore.getState().updateWallet(updatedWallet);
                    useAuthStore.getState().addTransaction(transactionRecord);

                    // Attempt database updates in background (best effort, do not fail the process if offline)
                    try {
                        const newUsedBy = [...usedByArray, user.uid];
                        await supabase
                            .from("vouchers")
                            .update({
                                used_by: newUsedBy,
                                status: isExhausted ? "exhausted" : "active"
                            })
                            .eq("code", normalizedCode);

                        await supabase
                            .from("profiles")
                            .update({
                                wallet: updatedWallet,
                                history: [transactionRecord, ...currentHistory]
                            })
                            .eq("id", user.uid);
                    } catch (dbErr) {
                        console.warn("Background DB update for voucher redemption failed:", dbErr);
                    }

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
