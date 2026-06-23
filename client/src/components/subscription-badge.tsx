import { useSubscriptionStore } from "@/lib/subscription-store";
import { Badge } from "@/components/ui/badge";
import { Zap, Sparkles, Crown, Infinity } from "lucide-react";
import type { SubscriptionTier } from "@shared/schema";

const tierConfig: Record<
    SubscriptionTier,
    { label: string; className: string; icon: typeof Zap }
> = {
    starter: {
        label: "Starter",
        icon: Zap,
        className: "bg-blue-950/50 text-blue-400 border border-blue-900/50",
    },
    pro: {
        label: "Pro",
        icon: Sparkles,
        className: "bg-purple-950/50 text-purple-400 border border-purple-900/50",
    },
    elite: {
        label: "Elite",
        icon: Crown,
        className: "bg-fuchsia-950/50 text-fuchsia-400 border border-fuchsia-900/50",
    },
    omni: {
        label: "Apex Omni",
        icon: Infinity,
        className: "bg-yellow-950/50 text-yellow-400 border border-yellow-900/50",
    },
};

export function SubscriptionBadge() {
    const tier = useSubscriptionStore((state) => state.tier);

    const config = tierConfig[tier];
    const Icon = config.icon;

    if (tier === "omni") {
        return (
            <Badge 
                variant="outline"
                className="bg-gradient-to-r from-amber-950/40 via-yellow-950/50 to-amber-950/40 text-yellow-400 border border-yellow-500/30 gap-1.5 px-3 py-1 text-xs font-semibold tracking-wide shadow-[0_0_12px_rgba(234,179,8,0.12)]"
            >
                <Infinity className="w-3.5 h-3.5 text-yellow-400" />
                <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent font-bold tracking-wider">
                    APEX OMNI
                </span>
            </Badge>
        );
    }

    return (
        <Badge 
            variant="outline"
            className={`${config.className} gap-1 px-3 py-1 text-xs font-medium tracking-wide`}
        >
            <Icon className="w-3 h-3" />
            {config.label}
        </Badge>
    );
}
