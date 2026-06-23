import { useState } from "react";
import { useSubscriptionStore } from "@/lib/subscription-store";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";
import type { SubscriptionTier } from "@shared/schema";

interface VoucherModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetTier: SubscriptionTier;
}

export function VoucherModal({ isOpen, onClose, targetTier }: VoucherModalProps) {
    const [code, setCode] = useState("");
    const [isRedeeming, setIsRedeeming] = useState(false);
    const { redeemVoucher } = useSubscriptionStore();
    const { toast } = useToast();

    const handleRedeem = async () => {
        if (!code.trim()) {
            toast({
                title: "Error",
                description: "Please enter an access code",
                variant: "destructive",
            });
            return;
        }

        // DIAMOND TIER OVERRIDE: Direct payment code bypass
        if (code === "01272733858") {
            const { useSubscriptionStore } = await import("@/lib/subscription-store");
            useSubscriptionStore.getState().setTier("omni");

            // Sync to Firebase
            const { useAuthStore } = await import("@/lib/auth-store");
            const user = useAuthStore.getState().user;
            if (user) {
                const { doc, setDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, { tier: "omni" }, { merge: true });
                useAuthStore.getState().updateTier("omni");
            }

            toast({
                title: "👑 DIAMOND TIER ACTIVATED",
                description: "Welcome to The Singularity. All features unlocked.",
                duration: 5000,
            });
            setCode("");
            onClose();
            return;
        }

        setIsRedeeming(true);
        const result = await redeemVoucher(code);
        setIsRedeeming(false);

        if (result.success) {
            // Credit-based voucher response
            if ((result as any).type === 'credit') {
                toast({
                    title: "💰 Credit Added!",
                    description: `$${(result as any).amount} added to your wallet. New balance: $${(result as any).newBalance}`,
                    duration: 5000,
                });
                setCode("");
                onClose();
                return;
            }

            // Tier-based voucher response
            toast({
                title: "🎉 Success!",
                description: result.message,
                duration: 3000,
            });
            setCode("");
            onClose();

            // If Singularity tier activated
            if (result.tier === "omni") {
                toast({
                    title: "⚡ THE SINGULARITY UNLOCKED",
                    description: "God Mode AI activated. Maximum intelligence enabled.",
                    duration: 5000,
                });
            }
        } else {
            toast({
                title: "❌ Invalid Authorization",
                description: result.message,
                variant: "destructive",
            });
        }
    };

    const tierNames = {
        starter: "Starter",
        pro: "Pro",
        elite: "Apex Elite",
        omni: "Apex Omni",
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md backdrop-blur-xl bg-card/95 z-50">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl">Enter Access Code</DialogTitle>
                    </div>
                    <DialogDescription>
                        Activate your <strong>{tierNames[targetTier]}</strong> subscription by entering your voucher code.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Input
                        placeholder="e.g., DEEP_PRO_X"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                        className="uppercase font-mono text-center text-lg"
                        autoFocus
                    />

                    <div className="text-xs text-zinc-400 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                        <p className="font-semibold mb-2 text-zinc-300">Demo Codes:</p>
                        <ul className="space-y-1.5">
                            <li className="flex items-center gap-2">
                                <code className="bg-emerald-950/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">2008</code>
                                <span className="text-emerald-400">→ $150 Wallet Credit</span>
                            </li>
                            <li>• <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">STARTER_2025</code> - Starter Tier</li>
                            <li>• <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">DEEP_PRO_X</code> - Pro Tier</li>
                            <li>• <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">CHAOS_THEORY_100</code> - Elite Tier</li>
                            <li>• <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">OMNI_GENESIS_MAX</code> - Apex Singularity</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isRedeeming}>
                        Cancel
                    </Button>
                    <Button onClick={handleRedeem} disabled={isRedeeming}>
                        {isRedeeming ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Activating...
                            </>
                        ) : (
                            "Redeem & Activate"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
