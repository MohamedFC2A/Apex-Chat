import { useSubscriptionStore } from "@/lib/subscription-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Lock } from "lucide-react";
import type { AIModel } from "@shared/schema";
import { MODELS, MODEL_INFO, MODEL_TIER_MAP } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  disabled?: boolean;
}

const TIER_LABELS: Record<string, string> = {
  omni:    "TIER·4 // OMNI",
  elite:   "TIER·3 // ELITE",
  pro:     "TIER·2 // PRO",
  starter: "TIER·1 // STARTER",
};

const TIER_ORDER = ["omni", "elite", "pro", "starter"];

export function ModelSelector({ selectedModel, onSelectModel, disabled }: ModelSelectorProps) {
  const { canAccessModel, tier } = useSubscriptionStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const currentModelInfo = MODEL_INFO[selectedModel];
  const modelsByTier = TIER_ORDER.map((t) => ({
    tier: t,
    models: MODELS.filter((m) => MODEL_TIER_MAP[m] === t),
  }));

  return (
    <DropdownMenu open={isOpen && !disabled} onOpenChange={(open) => !disabled && setIsOpen(open)}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <motion.div
          whileHover={disabled ? {} : { scale: 1.01 }}
          whileTap={disabled ? {} : { scale: 0.99 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Button
            variant="outline"
            disabled={disabled}
            className={`
              model-selector-btn h-9 px-3 gap-2
              min-w-[160px] sm:min-w-[210px]
              justify-start
              bg-black border border-white/10
              text-white font-mono text-xs tracking-widest uppercase
              hover:bg-white/5 hover:border-white/20
              transition-all duration-150
              rounded-sm
              ${disabled ? "opacity-40 cursor-not-allowed" : ""}
            `}
          >
            <span className="text-white/30 text-[10px]">▶</span>
            <span className="flex-1 text-left truncate">
              {currentModelInfo?.name?.toUpperCase() ?? "SELECT MODEL"}
            </span>
            <ChevronDown className={`w-3 h-3 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </Button>
        </motion.div>
      </DropdownMenuTrigger>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
          >
            <DropdownMenuContent
              forceMount
              align="start"
              sideOffset={6}
              className="
                w-[min(22rem,calc(100vw-1rem))]
                max-h-[min(80vh,34rem)]
                overflow-y-auto overscroll-contain
                bg-[#0a0a0a] border border-white/10
                rounded-sm shadow-2xl shadow-black/80
                p-0
              "
            >
              {/* Header */}
              <div className="px-4 pt-3 pb-2 border-b border-white/5">
                <p className="font-mono text-[10px] tracking-[0.2em] text-white/25 uppercase">
                  SELECT·MODEL // upgrade اشتراك ترقية
                </p>
              </div>

              {/* Model groups */}
              {modelsByTier.map(({ tier: t, models }) => {
                if (models.length === 0) return null;
                return (
                  <div key={t} className="py-1">
                    {/* Tier label */}
                    <div className="px-4 py-1.5 flex items-center gap-2">
                      <span className="font-mono text-[9px] tracking-[0.25em] text-white/20 uppercase">
                        {TIER_LABELS[t]}
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* Models in this tier */}
                    {models.map((model) => {
                      const info = MODEL_INFO[model];
                      const canAccess = canAccessModel(model);
                      const isSelected = model === selectedModel;

                      return (
                        <DropdownMenuItem
                          key={model}
                          onClick={() => {
                            if (canAccess) {
                              onSelectModel(model);
                            } else {
                              toast({
                                title: "LOCKED",
                                description: `Upgrade your subscription to access ${info.name}.`,
                                variant: "destructive",
                              });
                            }
                          }}
                          className={`
                            relative mx-1 px-3 py-2.5 rounded-sm
                            cursor-pointer transition-all duration-100
                            focus:outline-none
                            ${isSelected
                              ? "bg-white text-black"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                            }
                            ${!canAccess ? "opacity-40" : ""}
                          `}
                        >
                          <div className="flex items-center gap-3 w-full">
                            {/* Active indicator */}
                            <span className={`text-[9px] font-mono shrink-0 w-3 ${isSelected ? "text-black" : "text-white/15"}`}>
                              {isSelected ? "▶" : "·"}
                            </span>

                            {/* Model info */}
                            <div className="flex-1 min-w-0">
                              <p className={`font-mono text-xs tracking-wider uppercase leading-none mb-0.5 ${isSelected ? "text-black" : "text-white/90"}`}>
                                {info.name}
                              </p>
                              <p className={`font-mono text-[10px] tracking-wide leading-tight truncate ${isSelected ? "text-black/60" : "text-white/30"}`}>
                                {info.subtitle}
                              </p>
                            </div>

                            {/* Lock icon */}
                            {!canAccess && (
                              <Lock className="w-3 h-3 shrink-0 text-white/20" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/5 mt-1">
                <p className="font-mono text-[9px] tracking-[0.15em] text-white/15 uppercase">
                  APEX·CHAT // AI·STUDIO
                </p>
              </div>
            </DropdownMenuContent>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
