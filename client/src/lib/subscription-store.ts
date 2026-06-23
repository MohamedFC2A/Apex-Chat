import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubscriptionTier, AIModel, Voucher } from "@shared/schema";
import { MODELS, MODEL_TIER_MAP } from "@/lib/constants";

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

                    // Normalize code (trim whitespace + uppercase)
                    const normalizedCode = String(code).trim().toUpperCase();
                    if (!normalizedCode) {
                        return {
                            success: false,
                            message: "Please enter a voucher code.",
                        };
                    }

                    // Import Firestore Tools
                    const { db } = await import("./firebase");
                    const { collection, query, where, getDocs, limit, doc, runTransaction, arrayUnion } = await import("firebase/firestore");

                    // STEP 1: QUERY-BASED LOOKUP (Find voucher by code field, not doc ID)
                    const vouchersRef = collection(db, "vouchers");
                    const q = query(vouchersRef, where("code", "==", normalizedCode), limit(1));
                    const querySnapshot = await getDocs(q);

                    if (querySnapshot.empty) {
                        return {
                            success: false,
                            message: "Invalid voucher code. Please check and try again.",
                        };
                    }

                    // Get the voucher document (first match)
                    const voucherDoc = querySnapshot.docs[0];
                    const voucherRef = voucherDoc.ref;
                    const voucherData = voucherDoc.data() as Voucher;

                    // Pre-transaction validation (fast-fail checks)
                    if (voucherData.status === "exhausted") {
                        return {
                            success: false,
                            message: "This voucher has reached its maximum usage limit.",
                        };
                    }

                    // Check if user already used this voucher
                    const usedByArray = voucherData.usedBy || [];
                    if (usedByArray.includes(user.uid)) {
                        return {
                            success: false,
                            message: "You have already redeemed this voucher.",
                        };
                    }

                    // Transaction Result Variables
                    let newBalance = 0;
                    let redeemedAmount = 0;
                    let remainingUses = 0;
                    const userRef = doc(db, "users", user.uid);

                    // STEP 2: ATOMIC TRANSACTION (Multi-Use Logic)
                    await runTransaction(db, async (transaction) => {
                        // 1. RE-READ PHASE (Inside transaction for atomicity)
                        const voucherSnap = await transaction.get(voucherRef);
                        const userSnap = await transaction.get(userRef);

                        // 2. VALIDATION PHASE (Re-check inside transaction)
                        if (!voucherSnap.exists()) {
                            throw "Voucher disappeared during transaction.";
                        }

                        const freshVoucherData = voucherSnap.data() as Voucher;
                        const currentUsedBy = freshVoucherData.usedBy || [];
                        const maxUses = freshVoucherData.maxUses || 1; // Default to single-use for legacy vouchers
                        
                        // CRITICAL: Race condition check (voucher exhausted)
                        if (freshVoucherData.status === "exhausted") {
                            throw "This voucher has reached its maximum usage limit.";
                        }
                        
                        // CRITICAL: Check if this user already redeemed (inside transaction)
                        if (currentUsedBy.includes(user.uid)) {
                            throw "You have already redeemed this voucher.";
                        }
                        
                        // CRITICAL: Check if max uses reached (race condition protection)
                        if (currentUsedBy.length >= maxUses) {
                            throw "This voucher has reached its maximum usage limit.";
                        }
                        
                        // Ensure amount is valid
                        if (!freshVoucherData.amount || freshVoucherData.amount <= 0) {
                            throw "This voucher has no credit value.";
                        }

                        // 3. CALCULATION PHASE
                        const userData = userSnap.data() || {};
                        const currentWallet = userData.wallet || { balance: 0, currency: "USD" };
                        redeemedAmount = freshVoucherData.amount;
                        newBalance = (currentWallet.balance || 0) + redeemedAmount;
                        remainingUses = maxUses - (currentUsedBy.length + 1);

                        const transactionRecord = {
                            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            date: new Date().toISOString(),
                            type: 'CREDIT_REDEEM',
                            amount: redeemedAmount,
                            description: `Redeemed Code ${normalizedCode}`,
                        };

                        const currentHistory = userData.history || [];

                        // 4. ATOMIC WRITE PHASE (All-or-nothing commit)
                        
                        // Determine if voucher should be marked exhausted
                        const newUsedByLength = currentUsedBy.length + 1;
                        const isExhausted = newUsedByLength >= maxUses;
                        
                        // Update voucher with user tracking
                        transaction.update(voucherRef, {
                            usedBy: arrayUnion(user.uid),
                            status: isExhausted ? "exhausted" : "active",
                            lastRedeemedAt: new Date().toISOString(),
                            lastRedeemedBy: user.uid
                        });

                        // Credit user wallet and add transaction history
                        transaction.set(userRef, {
                            wallet: { ...currentWallet, balance: newBalance },
                            history: [transactionRecord, ...currentHistory]
                        }, { merge: true });
                    });

                    // 6. SYNC LOCAL STATE (Success)
                    const { useWalletStore } = await import("./wallet-store");
                    // Force a re-fetch to ensure local state matches DB
                    await useWalletStore.getState().syncWalletFromFirebase(user.uid);

                    // Build success message with remaining uses info
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
