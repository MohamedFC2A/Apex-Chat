import { useSubscriptionStore } from "@/lib/subscription-store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Lock, Zap, Infinity as InfinityIcon } from "lucide-react";
import type { AIModel } from "@shared/schema";
import { MODELS, MODEL_INFO, MODEL_TIER_MAP } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const { canAccessModel, tier } = useSubscriptionStore();
  const [isOpen, setIsOpen] = useState(false);
  const [shakingModel, setShakingModel] = useState<AIModel | null>(null);
  
  const currentModelInfo = MODEL_INFO[selectedModel];
  const Icon = selectedModel === "apex-omni" ? InfinityIcon : (currentModelInfo?.icon || Zap);
  const isGodModeModel = selectedModel === "apex-unbound";
  const isFreeTier = tier === "starter";

  const omniModel: AIModel[] = MODELS.filter((m) => MODEL_TIER_MAP[m] === "omni");
  const eliteModels: AIModel[] = MODELS.filter((m) => MODEL_TIER_MAP[m] === "elite");
  const proModels: AIModel[] = MODELS.filter((m) => MODEL_TIER_MAP[m] === "pro");
  const starterModels: AIModel[] = MODELS.filter((m) => MODEL_TIER_MAP[m] === "starter");

  const handleLockedModelClick = (model: AIModel) => {
    setShakingModel(model);
    setTimeout(() => setShakingModel(null), 500);
  };

  const getButtonStyles = () => {
    if (selectedModel === "apex-unbound") {
      return {
        button: "bg-gradient-to-r from-violet-950/40 via-purple-950/50 to-violet-950/40 border border-violet-500/40 text-violet-400 hover:bg-violet-950/50 hover:border-violet-500/60 shadow-[0_0_12px_rgba(139,92,246,0.12)] rounded-lg",
        text: "bg-gradient-to-r from-violet-300 via-fuchsia-400 to-violet-200 bg-clip-text text-transparent font-bold tracking-wider",
        iconColor: "text-violet-400"
      };
    }
    const modelTier = MODEL_TIER_MAP[selectedModel];
    switch (modelTier) {
      case "omni":
        return {
          button: "bg-gradient-to-r from-amber-950/40 via-yellow-950/50 to-amber-950/40 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-950/50 hover:border-yellow-500/60 shadow-[0_0_12px_rgba(234,179,8,0.12)] rounded-lg",
          text: "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent font-bold tracking-wider",
          iconColor: "text-yellow-400"
        };
      case "elite":
        return {
          button: "bg-gradient-to-r from-emerald-950/30 via-teal-950/40 to-emerald-950/30 border border-emerald-500/45 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.12)] rounded-lg",
          text: "bg-gradient-to-r from-emerald-300 via-teal-400 to-emerald-200 bg-clip-text text-transparent font-bold tracking-wider",
          iconColor: "text-emerald-400"
        };
      case "pro":
        return {
          button: "bg-gradient-to-r from-purple-950/20 via-indigo-950/30 to-purple-950/20 border border-purple-500/30 text-purple-400 hover:bg-purple-950/45 hover:border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.08)] rounded-lg",
          text: "text-purple-300 font-semibold tracking-wide",
          iconColor: "text-purple-400"
        };
      case "starter":
      default:
        return {
          button: "bg-card hover:bg-muted border border-border text-foreground rounded-lg",
          text: "text-foreground font-medium",
          iconColor: "text-muted-foreground"
        };
    }
  };

  const currentStyles = getButtonStyles();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Button 
            variant="outline" 
            className={`gap-1.5 md:gap-2 min-w-0 md:min-w-[200px] max-w-[160px] md:max-w-none relative overflow-hidden transition-all duration-300 ${currentStyles.button} ${
              isFreeTier && selectedModel === "apex-flash" ? "shimmer-button" : ""
            }`}
          >
            {isFreeTier && selectedModel === "apex-flash" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              />
            )}
            <Icon className={`w-4 h-4 z-10 ${currentStyles.iconColor || "text-foreground"}`} />
            <span className={`flex-1 text-left truncate z-10 ${currentStyles.text}`}>
              {selectedModel === "apex-omni" ? "APEX OMNI" : (currentModelInfo?.name || "Select Model")}
            </span>
            {isGodModeModel && (
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[9px] font-semibold tracking-wider bg-violet-950/50 text-violet-400 border border-violet-900/50 px-1.5 py-0.5 rounded z-10"
              >
                CODE·AI
              </motion.span>
            )}
            <ChevronDown className={`w-4 h-4 z-10 ${currentStyles.iconColor || "text-foreground"}`} />
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <DropdownMenuContent
              forceMount
              align="start"
              className="w-[min(280px,calc(100vw-2rem))] bg-popover border border-border rounded-xl shadow-xl"
            >
          {/* Apex Omni - Ultimate Tier */}
          <DropdownMenuLabel className="text-yellow-600 dark:text-yellow-500 text-xs tracking-wide bg-gradient-to-r from-amber-500/10 to-transparent px-3 py-2">
            Apex Omni (Tier 4)
          </DropdownMenuLabel>
          {omniModel.map((model) => {
            const info = MODEL_INFO[model];
            const ModelIcon = info.icon;
            const canAccess = canAccessModel(model);
            const isSelected = model === selectedModel;

            return (
              <DropdownMenuItem
                key={model}
                disabled={!canAccess}
                onClick={() => canAccess && onSelectModel(model)}
                className={`cursor-pointer hover:bg-accent transition-colors px-3 py-2.5 ${
                  isSelected ? "bg-accent" : ""
                } ${!canAccess ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <ModelIcon className={`w-4 h-4 shrink-0 ${canAccess ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${canAccess ? "text-amber-600 dark:text-amber-300" : "text-foreground"}`}>{info.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{info.subtitle}</div>
                  </div>
                  {!canAccess && <Lock className="w-3 h-3 shrink-0 text-muted-foreground" />}
                </div>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="bg-border" />

          {/* Elite Tier */}
          <DropdownMenuLabel className="text-xs tracking-wide text-muted-foreground px-3 py-2">Elite Tier</DropdownMenuLabel>
          {eliteModels.map((model) => {
            const info = MODEL_INFO[model];
            const ModelIcon = info.icon;
            const canAccess = canAccessModel(model);
            const isSelected = model === selectedModel;

            return (
              <DropdownMenuItem
                key={model}
                disabled={!canAccess}
                onClick={() => canAccess && onSelectModel(model)}
                className={`cursor-pointer hover:bg-accent transition-colors px-3 py-2.5 ${
                  isSelected ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <ModelIcon className="w-4 h-4 shrink-0 text-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-foreground">{info.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{info.subtitle}</div>
                  </div>
                  {!canAccess && <Lock className="w-3 h-3 shrink-0 text-muted-foreground" />}
                </div>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuLabel className="text-xs tracking-wide text-muted-foreground px-3 py-2">Pro Tier</DropdownMenuLabel>
          {proModels.map((model) => {
            const info = MODEL_INFO[model];
            const ModelIcon = info.icon;
            const canAccess = canAccessModel(model);
            const isSelected = model === selectedModel;

            return (
              <DropdownMenuItem
                key={model}
                disabled={!canAccess}
                onClick={() => canAccess && onSelectModel(model)}
                className={`cursor-pointer hover:bg-accent transition-colors px-3 py-2.5 ${
                  isSelected ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <ModelIcon className="w-4 h-4 shrink-0 text-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-foreground">{info.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{info.subtitle}</div>
                  </div>
                  {!canAccess && <Lock className="w-3 h-3 shrink-0 text-muted-foreground" />}
                </div>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuLabel className="text-xs tracking-wide text-muted-foreground px-3 py-2">Starter Tier</DropdownMenuLabel>
          {starterModels.map((model) => {
            const info = MODEL_INFO[model];
            const ModelIcon = info.icon;
            const isSelected = model === selectedModel;

            return (
              <DropdownMenuItem
                key={model}
                onClick={() => onSelectModel(model)}
                className={`cursor-pointer hover:bg-accent transition-colors px-3 py-2.5 ${
                  isSelected ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <ModelIcon className="w-4 h-4 shrink-0 text-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-foreground">{info.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{info.subtitle}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
            </DropdownMenuContent>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
