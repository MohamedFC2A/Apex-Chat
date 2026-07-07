import { useSubscriptionStore } from "@/lib/subscription-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Lock } from "lucide-react";
import type { AIModel } from "@shared/schema";
import { MODELS, MODEL_INFO, MODEL_TIER_MAP } from "@/lib/constants";
import { TIERS, getTierForModel } from "@/lib/tier-tokens";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ModelLetterIcon } from "@/components/model-letter-icon";
import { TierSection } from "./tier-section";
import { cn } from "@/lib/utils";

export interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  disabled?: boolean;
  isLocked?: boolean;
}

export function ModelSelector({
  selectedModel,
  onSelectModel,
  disabled,
  isLocked,
}: ModelSelectorProps) {
  const { canAccessModel } = useSubscriptionStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const currentModelInfo = MODEL_INFO[selectedModel];
  const currentTier = getTierForModel(selectedModel);

  // Group models by tier
  const modelsByTier = TIERS.map((t) => ({
    ...t,
    models: MODELS.filter((m) => MODEL_TIER_MAP[m] === t.id),
  }));

  return (
    <DropdownMenu
      open={isOpen && !disabled && !isLocked}
      onOpenChange={(open) => {
        if (isLocked && open) {
          toast({
            title: "تغيير النموذج مقفول",
            description:
              "لتغيير نموذج الذكاء الاصطناعي، يرجى إنشاء محادثة جديدة للبدء بموديل آخر.",
          });
          return;
        }
        if (!disabled && !isLocked) setIsOpen(open);
      }}
    >
      {/* ─── Trigger ─── */}
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "model-selector-btn h-9 px-3 gap-2.5",
            "min-w-[170px] sm:min-w-[230px] justify-start",
            "bg-[#09090b] border border-white/[0.08]",
            "font-mono text-[11px] tracking-widest uppercase text-white",
            "hover:bg-white/[0.04] hover:border-white/[0.18]",
            "transition-all duration-150 rounded-[6px] active:scale-[0.98]",
            "relative overflow-hidden",
            disabled && "opacity-40 cursor-not-allowed",
            isLocked && "opacity-70 cursor-pointer border-dashed border-zinc-700",
          )}
          style={
            !disabled && !isLocked
              ? {
                  borderColor: isOpen
                    ? `hsl(var(--tier-${currentTier.cssVarKey}-accent) / 0.35)`
                    : undefined,
                }
              : undefined
          }
        >
          {/* Icon */}
          <span className="shrink-0 relative z-10 opacity-80">
            <ModelLetterIcon model={selectedModel} size={26} />
          </span>

          {/* Label */}
          <span
            className="flex-1 text-left truncate font-bold relative z-10"
            style={{ color: "#e2e8f0" }}
          >
            {currentModelInfo?.name?.toUpperCase() ?? "SELECT MODEL"}
          </span>

          {/* Right icon */}
          {isLocked ? (
            <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 animate-pulse relative z-10" />
          ) : (
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-white/30 transition-transform duration-200 shrink-0 relative z-10",
                isOpen && "rotate-180",
              )}
            />
          )}
        </Button>
      </DropdownMenuTrigger>

      {/* ─── Dropdown Panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          >
            <DropdownMenuContent
              forceMount
              align="start"
              sideOffset={6}
              className="p-0 gap-0 border-0 bg-transparent shadow-none"
              style={{ width: "min(22rem, calc(100vw - 1.5rem))" }}
            >
              {/* Outer shell */}
              <div
                className="flex flex-col overflow-hidden rounded-[10px]"
                style={{
                  background: "#09090b",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow:
                    "0 20px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.03)",
                  maxHeight: "min(84vh, 36rem)",
                }}
              >
                {/* ── Header bar ── */}
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.05] shrink-0"
                  style={{ background: "rgba(255, 255, 255, 0.01)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                      style={{ background: "#6366f1" }}
                    />
                    <span className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase text-white/30">
                      SELECT MODEL
                    </span>
                  </div>
                  <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-white/15">
                    APEX·AI
                  </span>
                </div>

                {/* ── Scrollable tier sections ── */}
                <div className="overflow-y-auto overscroll-contain flex-1">
                  {modelsByTier.map((tier) => {
                    if (tier.models.length === 0) return null;
                    return (
                      <TierSection
                        key={tier.id}
                        tier={tier}
                        models={tier.models}
                        selectedModel={selectedModel}
                        canAccessModel={canAccessModel}
                        onSelect={(model) => {
                          onSelectModel(model);
                          setIsOpen(false);
                        }}
                        onLocked={(name) => {
                          toast({
                            title: "MODEL LOCKED",
                            description: `Upgrade your plan to access ${name}.`,
                            variant: "destructive",
                          });
                        }}
                      />
                    );
                  })}
                </div>

                {/* ── Footer ── */}
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 border-t border-white/[0.05] shrink-0"
                  style={{ background: "rgba(255, 255, 255, 0.01)" }}
                >
                  <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-white/18">
                    APEX-CHAT
                  </span>

                  {/* Upgrade button — using shadcn/ui Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-1 px-2 font-mono text-[8px] font-bold tracking-[0.08em] uppercase rounded border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-100 transition-all duration-150"
                  >
                    UPGRADE ترقية
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
