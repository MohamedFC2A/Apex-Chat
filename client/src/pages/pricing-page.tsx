import { useState } from "react";
import { motion } from "framer-motion";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { useAuthStore } from "@/lib/auth-store";
import { useWalletStore } from "@/lib/wallet-store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PurchaseConfirmationModal } from "@/components/purchase-confirmation-modal";
import { Check, Zap, Sparkles, Crown, ArrowLeft, Lock, Infinity, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionTier } from "@shared/schema";
import { PlanPrices } from "@shared/schema";

// TIER HIERARCHY SYSTEM
const TIER_RANKS: Record<SubscriptionTier, number> = {
    starter: 0,
    pro: 1,
    elite: 2,
    omni: 3,
};

function canUpgradeToTier(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
    return TIER_RANKS[targetTier] > TIER_RANKS[currentTier];
}

const tiers = [
    {
        id: "starter" as SubscriptionTier,
        name: "Starter",
        price: "$0",
        originalPrice: null,
        subtitle: "Perfect for Getting Started",
        icon: Zap,
        color: "zinc",
        borderClass: "border-zinc-700/50",
        glowClass: "group-hover:shadow-lg group-hover:shadow-zinc-800/20",
        bgGradient: "from-zinc-950 to-zinc-900",
        features: [
            "APEX Flash Access",
            "Basic Speed & Reasoning",
            "Unlimited Messages",
            "No Usage Caps",
        ],
        voucher: "STARTER_2025",
    },
    {
        id: "pro" as SubscriptionTier,
        name: "Pro",
        price: "$29",
        originalPrice: "$58",
        subtitle: "Advanced Reasoning & Analysis",
        icon: Sparkles,
        color: "zinc",
        popular: true,
        borderClass: "border-zinc-600/50",
        glowClass: "group-hover:shadow-lg group-hover:shadow-zinc-700/20",
        bgGradient: "from-zinc-900 to-zinc-950",
        features: [
            "APEX Pro - Advanced Reasoning",
            "APEX Pro - Code & Logic Specialist",
            "🌐 Deep Research Mode",
            "Extended Context Window (1M tokens)",
            "Priority Processing Speed",
        ],
        voucher: "DEEP_PRO_X",
    },
    {
        id: "elite" as SubscriptionTier,
        name: "Elite",
        price: "$79",
        originalPrice: "$158",
        subtitle: "Research-Grade Intelligence",
        icon: Crown,
        color: "zinc",
        borderClass: "border-zinc-600/50",
        glowClass: "group-hover:shadow-lg group-hover:shadow-zinc-700/20",
        bgGradient: "from-zinc-900 to-zinc-950",
        features: [
            "All Pro Features",
            "APEX Elite - Cognitive Architecture",
            "Extreme Response Speed",
            "Advanced Analytics & Insights",
            "VIP Dedicated Support",
        ],
        voucher: "CHAOS_THEORY_100",
    },
    {
        id: "omni" as SubscriptionTier,
        name: "APEX OMNI",
        price: "$149",
        originalPrice: null,
        subtitle: "The God Tier",
        tagline: "Where Intelligence Becomes Infinite",
        icon: Infinity,
        color: "amber",
        ultimate: true,
        borderClass: "border-amber-500/50",
        glowClass: "group-hover:shadow-[0_0_80px_rgba(245,158,11,0.4)]",
        bgGradient: "from-zinc-950 via-amber-950/20 to-zinc-950",
        features: [
            "🧠 Apex Omni — Deca-Core Cognitive Engine",
            "🌲 Advanced Reasoning: ToT / GoT & Monte Carlo Tree Search (MCTS)",
            "🤖 Reinforcement Learning via GRPO & Inference-Time Compute",
            "🎯 Constraint Adherence: Logit Biasing & Grammar-Guided Gen",
            "🌀 Guided Decoding: Outlines / Guidance / vLLM",
            "🐍 Technical Stack: Python, PyTorch & Hugging Face",
            "📊 Dataset Engineering & Supervised Fine-Tuning (SFT)",
            "🚀 Priority Access & Dedicated VIP Support",
        ],
        voucher: "OMNI_GENESIS_MAX",
    },
];

export default function PricingPage() {
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const { tier: currentTier } = useSubscriptionStore();
    const { user } = useAuthStore();
    const { purchasePlan } = useWalletStore();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const walletBalance = user?.wallet?.balance ?? 0;

    const handlePurchaseClick = (targetTier: SubscriptionTier) => {
        if (!user) {
            toast({
                title: "Sign In Required",
                description: "Please sign in to purchase a plan.",
                variant: "destructive",
            });
            return;
        }

        setSelectedTier(targetTier);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmPurchase = async () => {
        if (!user || !selectedTier) return;

        const result = await purchasePlan(selectedTier, user.uid);

        if (result.success) {
            toast({
                title: "🎉 Subscription Activated!",
                description: result.message,
                duration: 5000,
            });
            // Redirect to chat after successful purchase
            setTimeout(() => {
                setLocation("/chat");
            }, 1500);
        } else {
            toast({
                title: "❌ Purchase Failed",
                description: result.message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen bg-black relative overflow-x-hidden font-sans">
            {/* Enhanced Background with Holographic Grid */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-40 pointer-events-none" />
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

            <div className="relative z-10 container mx-auto px-4 py-8 pb-24">
                <Button
                    variant="ghost"
                    className="mb-8 text-zinc-400 hover:text-white"
                    onClick={() => setLocation("/chat")}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Chat
                </Button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    {/* Premium Header */}
                    <div className="inline-flex items-center justify-center p-2 mb-6 rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="bg-gradient-to-r from-zinc-800 to-zinc-700 text-white hover:from-zinc-700 hover:to-zinc-600 h-8 text-xs rounded-full px-6 font-semibold shadow-lg"
                        >
                            ✨ Monthly Subscription
                        </Button>
                    </div>

                    <h1 className="text-5xl sm:text-6xl font-black text-white mb-4 tracking-tight">
                        <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                            Premium Plans
                        </span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Enterprise-grade AI infrastructure. 
                        <span className="text-emerald-400 font-semibold">Transparent pricing</span>, unlimited potential.
                    </p>

                    {/* Obsidian Glass Wallet Balance Card */}
                    {user && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8 mx-auto max-w-lg"
                        >
                            <div className="relative group">
                                {/* Holographic Border */}
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5 shadow-2xl">
                                    {/* Top Accent Line */}
                                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-emerald-500/20 blur-xl" />
                                                <div className="relative p-3 bg-gradient-to-br from-emerald-950/50 to-emerald-900/30 rounded-2xl border border-emerald-800/50">
                                                    <Wallet className="w-6 h-6 text-emerald-400" />
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Available Balance</p>
                                                <p className="text-3xl font-black bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                                                    ${walletBalance.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        {walletBalance < 29 && (
                                            <div className="flex items-center gap-2.5 text-amber-400 bg-gradient-to-r from-amber-950/30 to-orange-950/20 px-4 py-2 rounded-xl border border-amber-800/30 backdrop-blur-sm">
                                                <AlertCircle className="w-4 h-4 animate-pulse" />
                                                <span className="text-xs font-bold">Top Up</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentTier !== "starter" && (
                        <Badge className="bg-gradient-to-r from-zinc-800 to-zinc-700 text-zinc-200 border-zinc-600 mt-6 px-4 py-1.5 text-sm font-semibold">
                            👑 Current: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Tier
                        </Badge>
                    )}
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {tiers.map((tierInfo, index) => {
                        const isCurrentTier = currentTier === tierInfo.id;
                        const canUpgrade = canUpgradeToTier(currentTier, tierInfo.id);
                        const isDowngrade = TIER_RANKS[tierInfo.id] < TIER_RANKS[currentTier];
                        const tierPrice = PlanPrices[tierInfo.id];
                        const canAfford = walletBalance >= tierPrice;

                        return (
                            <motion.div
                                key={tierInfo.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative group ${
                                    tierInfo.ultimate ? 'lg:-mt-8 lg:z-10 lg:scale-105' : tierInfo.popular ? 'lg:scale-102 lg:z-[5]' : ''
                                }`}
                            >
                                {/* Holographic Border Effect */}
                                <div className={`absolute -inset-[1px] rounded-2xl transition-opacity duration-500 ${
                                    tierInfo.ultimate 
                                        ? 'bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-500/30 opacity-0 group-hover:opacity-100' 
                                        : tierInfo.popular
                                        ? 'bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-emerald-500/30 opacity-50 group-hover:opacity-100'
                                        : 'bg-gradient-to-r from-zinc-700/20 via-zinc-600/20 to-zinc-700/20 opacity-0 group-hover:opacity-100'
                                }`} />
                                
                                <Card className={`relative h-full p-6 bg-gradient-to-b ${
                                    tierInfo.bgGradient
                                } border ${
                                    tierInfo.popular ? 'border-emerald-500/50' : tierInfo.borderClass
                                } ${
                                    tierInfo.glowClass
                                } transition-all duration-300 overflow-hidden flex flex-col backdrop-blur-xl`}>
                                    {/* Top Accent Line */}
                                    <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent to-transparent ${
                                        tierInfo.ultimate 
                                            ? 'via-amber-500/50' 
                                            : tierInfo.popular 
                                            ? 'via-zinc-500/30' 
                                            : 'via-zinc-700/20'
                                    }`} />
                                    {tierInfo.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black px-4 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] tracking-widest z-20">
                                            ⭐ MOST POPULAR
                                        </div>
                                    )}
                                    {tierInfo.ultimate && (
                                        <>
                                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 rounded-full text-[10px] font-black tracking-widest text-white border border-amber-400/50 shadow-2xl z-20 animate-pulse">
                                                🔥 GOD TIER
                                            </div>
                                        </>
                                    )}

                                    <div className="mb-6">
                                        <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${
                                            tierInfo.ultimate 
                                                ? 'from-amber-950/50 to-orange-950/50 border-amber-800/50' 
                                                : 'from-zinc-900/50 to-zinc-800/50 border-zinc-700/50'
                                        } border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                            {tierInfo.ultimate && (
                                                <div className="absolute inset-0 bg-amber-500/10 blur-xl" />
                                            )}
                                            <tierInfo.icon className={`w-7 h-7 relative z-10 ${
                                                tierInfo.ultimate ? 'text-amber-400' : 'text-zinc-400'
                                            }`} />
                                        </div>
                                        <h3 className={`text-xl font-black mb-2 ${
                                            tierInfo.ultimate 
                                                ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 bg-clip-text text-transparent' 
                                                : 'text-white'
                                        }`}>
                                            {tierInfo.name}
                                        </h3>
                                        {tierInfo.tagline && (
                                            <p className="text-xs text-amber-500/80 font-medium mb-1 uppercase tracking-widest">{tierInfo.tagline}</p>
                                        )}
                                        <p className="text-zinc-400 text-sm h-10">{tierInfo.subtitle}</p>
                                    </div>

                                    <div className="flex items-baseline gap-2 mb-8">
                                        {(tierInfo as any).originalPrice && (
                                            <span className="text-lg text-zinc-600 line-through decoration-red-500/50 font-semibold">
                                                {(tierInfo as any).originalPrice}
                                            </span>
                                        )}
                                        <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                                            (tierInfo as any).originalPrice 
                                                ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' 
                                                : tierInfo.ultimate
                                                ? 'bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent'
                                                : 'text-white'
                                        }`}>
                                            {tierInfo.price}
                                        </span>
                                        <span className="text-zinc-500 text-sm font-medium">/mo</span>
                                    </div>

                                    <ul className="space-y-3 mb-8 flex-grow">
                                        {tierInfo.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5 text-sm">
                                                <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                                                    tierInfo.ultimate ? 'text-amber-400' : 'text-emerald-500/70'
                                                }`} />
                                                <span className="text-zinc-300 leading-relaxed">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-auto">
                                        {isCurrentTier ? (
                                            <Button className="w-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-semibold" disabled>
                                                ✅ Active Plan
                                            </Button>
                                        ) : tierInfo.id === "starter" ? (
                                            <Button className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-semibold" variant="outline" disabled>
                                                <Lock className="w-4 h-4 mr-2" />
                                                Always Free
                                            </Button>
                                        ) : isDowngrade ? (
                                            <Button className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-semibold" variant="outline" disabled>
                                                <Lock className="w-4 h-4 mr-2" />
                                                Cannot Downgrade
                                            </Button>
                                        ) : (
                                            <Button
                                                className={`w-full text-white font-bold relative overflow-hidden group/btn transition-all duration-300 ${
                                                    tierInfo.ultimate
                                                        ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:via-orange-500 hover:to-amber-500 border-2 border-amber-500/30 shadow-lg hover:shadow-amber-500/50"
                                                        : "bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 border border-zinc-600/50"
                                                } ${
                                                    !canAfford ? 'opacity-60 cursor-not-allowed' : ''
                                                }`}
                                                onClick={() => handlePurchaseClick(tierInfo.id)}
                                                disabled={!canAfford}
                                            >
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    <Wallet className="w-4 h-4" />
                                                    {canAfford ? 'Purchase Now' : `Need $${(tierPrice - walletBalance).toFixed(0)} More`}
                                                </span>
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Purchase Confirmation Modal */}
            <PurchaseConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                tier={selectedTier || "starter"}
                currentBalance={walletBalance}
                onConfirm={handleConfirmPurchase}
            />
        </div>
    );
}
