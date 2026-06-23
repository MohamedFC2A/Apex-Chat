import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, CheckCircle2, AlertTriangle, Database, Lock, Server } from "lucide-react";
import { PlanPrices } from "@shared/schema";
import type { SubscriptionTier } from "@shared/schema";

interface PurchaseConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    tier: SubscriptionTier;
    currentBalance: number;
    onConfirm: () => Promise<void>;
}

export function PurchaseConfirmationModal({
    isOpen,
    onClose,
    tier,
    currentBalance,
    onConfirm,
}: PurchaseConfirmationModalProps) {
    const [processingStep, setProcessingStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    // 0: Idle, 1: Verifying, 2: Allocating, 3: Confirming, 4: Success

    const [error, setError] = useState<string | null>(null);

    const planPrice = PlanPrices[tier];
    const newBalance = currentBalance - planPrice;
    const hasInsufficientFunds = newBalance < 0;

    const tierNames: Record<SubscriptionTier, string> = {
        starter: "Starter",
        pro: "Pro",
        elite: "Elite",
        omni: "Apex Singularity",
    };

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setProcessingStep(0);
            setError(null);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (hasInsufficientFunds) return;

        try {
            // STEP 1: Verifying Balance
            setProcessingStep(1);
            await new Promise(r => setTimeout(r, 800));

            // STEP 2: Allocating Resources
            setProcessingStep(2);
            await new Promise(r => setTimeout(r, 800));

            // STEP 3: Confirming Transaction
            setProcessingStep(3);
            await new Promise(r => setTimeout(r, 900));

            // ACTUAL TRANSACTION
            await onConfirm();

            // STEP 4: Success
            setProcessingStep(4);

            // Close after success animation
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err: any) {
            setError(err.message || "Transaction failed");
            setProcessingStep(0);
        }
    };

    const steps = [
        { icon: Shield, text: "Verifying Secure Balance..." },
        { icon: Server, text: "Allocating Dedicated Resources..." },
        { icon: Lock, text: "Updating Blockchain Ledger..." },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && processingStep !== 0 && processingStep !== 4 ? null : onClose()}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-2 border-zinc-800 overflow-hidden">
                <AnimatePresence mode="wait">
                    {processingStep === 4 ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center justify-center py-10"
                        >
                            <DialogTitle className="sr-only">Payment Successful</DialogTitle>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1.2, rotate: 360 }}
                                transition={{ type: "spring", damping: 10, stiffness: 200 }}
                                className="w-24 h-24 rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                            >
                                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                            </motion.div>
                            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Payment Complete</h3>
                            <p className="text-zinc-400 text-center">
                                Welcome to the {tierNames[tier]} Tier
                            </p>
                        </motion.div>
                    ) : processingStep > 0 ? (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-10 flex flex-col items-center"
                        >
                            <DialogTitle className="sr-only">Processing Payment</DialogTitle>
                            <div className="w-20 h-20 mb-8 relative">
                                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                                <motion.div
                                    className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {processingStep === 1 && <Shield className="w-8 h-8 text-emerald-500 animate-pulse" />}
                                    {processingStep === 2 && <Server className="w-8 h-8 text-amber-500 animate-pulse" />}
                                    {processingStep === 3 && <Lock className="w-8 h-8 text-purple-500 animate-pulse" />}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-6">Processing Securely</h3>

                            <div className="w-full max-w-xs space-y-4">
                                {steps.map((step, idx) => {
                                    const stepNum = idx + 1;
                                    const isActive = processingStep === stepNum;
                                    const isCompleted = processingStep > stepNum;

                                    return (
                                        <div key={idx} className={`flex items-center gap-3 transition-all duration-300 ${isActive || isCompleted ? "opacity-100" : "opacity-30"}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isCompleted
                                                ? "bg-emerald-500 border-emerald-500"
                                                : isActive
                                                    ? "border-emerald-500 bg-emerald-500/20"
                                                    : "border-zinc-700 bg-zinc-900"
                                                }`}>
                                                {isCompleted ? <CheckCircle2 className="w-4 h-4 text-black" /> : <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"}`} />}
                                            </div>
                                            <span className={`text-sm ${isActive ? "text-emerald-400 font-medium" : "text-zinc-500"}`}>{step.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-700 shadow-xl">
                                        <Shield className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <DialogTitle className="text-2xl text-white tracking-tight">Confirm Subscription</DialogTitle>
                                </div>
                                <DialogDescription className="text-zinc-400">
                                    Review your purchase details before confirming
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-6 space-y-4">
                                {/* Plan Details */}
                                <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 shadow-inner">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-zinc-500 font-medium">Plan</span>
                                        <div className="flex items-center gap-2">
                                            {tier === "omni" && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
                                            <span className="text-lg font-semibold text-white tracking-tight">{tierNames[tier]}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm text-zinc-500 font-medium">Price</span>
                                        <span className="text-lg font-mono text-white tracking-wider">${planPrice.toFixed(2)}</span>
                                    </div>

                                    <div className="relative h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-4" />

                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Current Balance</span>
                                        <span className="text-sm font-mono text-zinc-300">$ {currentBalance.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">New Balance</span>
                                        <motion.span
                                            key={newBalance}
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className={`text-xl font-mono font-bold ${newBalance >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-red-400'}`}
                                        >
                                            $ {newBalance.toFixed(2)}
                                        </motion.span>
                                    </div>
                                </div>

                                {/* Insufficient Funds Warning */}
                                {hasInsufficientFunds && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 flex items-start gap-3"
                                    >
                                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-red-400">Insufficient Funds</p>
                                            <p className="text-xs text-red-300 mt-1 opacity-80">
                                                Please top up your wallet in Billing before proceeding.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {error && (
                                    <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 flex items-center gap-3">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        <p className="text-xs text-red-400">{error}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={onClose}
                                        variant="ghost"
                                        className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-900"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={hasInsufficientFunds}
                                        className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.2)] hover:shadow-[0_0_30px_rgba(5,150,105,0.4)] transition-all duration-300"
                                    >
                                        Confirm Payment
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
