import { useSubscriptionStore } from "@/lib/subscription-store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { Badge } from "@/components/ui/badge";
import { Brain, Search, Skull, Lock } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function FeatureToggles() {
    const { canUseDeepResearch, canUseGodMode } = useSubscriptionStore();
    const { thinking, deepResearch, godMode, toggleThinking, toggleDeepResearch, toggleGodMode } =
        useFeatureToggleStore();

    return (
        <TooltipProvider>
            <div className="flex items-center gap-2 flex-wrap">
                {/* Thinking Badge temporarily hidden */}

                {/* Deep Research - Pro+ */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Badge
                                onClick={() => canUseDeepResearch() && toggleDeepResearch()}
                                className={`cursor-pointer transition-all ${!canUseDeepResearch()
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : deepResearch
                                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                                        : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                    }`}
                            >
                                {!canUseDeepResearch() && <Lock className="w-3 h-3 mr-1" />}
                                <Search className="w-3 h-3 mr-1" />
                                Deep Research
                            </Badge>
                        </span>
                    </TooltipTrigger>
                    {!canUseDeepResearch() && (
                        <TooltipContent>
                            <p>Requires Pro or Elite subscription</p>
                        </TooltipContent>
                    )}
                </Tooltip>

                {/* God Mode - Elite only */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Badge
                                onClick={() => canUseGodMode() && toggleGodMode()}
                                className={`cursor-pointer transition-all ${!canUseGodMode()
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : godMode
                                        ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                                        : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                    }`}
                            >
                                {!canUseGodMode() && <Lock className="w-3 h-3 mr-1" />}
                                <Skull className="w-3 h-3 mr-1" />
                                GOD MODE
                            </Badge>
                        </span>
                    </TooltipTrigger>
                    {!canUseGodMode() && (
                        <TooltipContent>
                            <p>Exclusive to Apex Elite subscription</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
