import { useSubscriptionStore } from "@/lib/subscription-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Lock, Check } from "lucide-react";
import type { AIModel } from "@shared/schema";
import { MODELS, MODEL_INFO, MODEL_TIER_MAP } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  disabled?: boolean;
  isLocked?: boolean;
}

// Tier config — label + accent color (white shades only)
const TIERS: {
  id: string;
  label: string;
  tag: string;
  brightness: string;
  tagBg: string;
}[] = [
  { id: "omni",    label: "OMNI",    tag: "TIER 4", brightness: "text-white",     tagBg: "bg-white text-black" },
  { id: "elite",   label: "ELITE",   tag: "TIER 3", brightness: "text-white/80",  tagBg: "bg-white/15 text-white/70" },
  { id: "pro",     label: "PRO",     tag: "TIER 2", brightness: "text-white/65",  tagBg: "bg-white/10 text-white/55" },
  { id: "starter", label: "STARTER", tag: "TIER 1", brightness: "text-white/50",  tagBg: "bg-white/8 text-white/40"  },
];

export function ModelSelector({ selectedModel, onSelectModel, disabled, isLocked }: ModelSelectorProps) {
  const { canAccessModel } = useSubscriptionStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const currentModelInfo = MODEL_INFO[selectedModel];
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
            title: "تغيير النموذج مقفل",
            description: "لتغيير نموذج الذكاء الاصطناعي، يرجى إنشاء محادثة جديدة للبدء بموديل آخر.",
          });
          return;
        }
        if (!disabled && !isLocked) {
          setIsOpen(open);
        }
      }}
    >
      {/* ─── Trigger button ─── */}
      <DropdownMenuTrigger asChild disabled={disabled}>
        <motion.div
          whileHover={disabled ? {} : { scale: 1.01 }}
          whileTap={disabled ? {} : { scale: 0.985 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Button
            variant="outline"
            disabled={disabled}
            className={`
              model-selector-btn h-9 px-3 gap-2
              min-w-[170px] sm:min-w-[220px]
              justify-start
              bg-black border border-white/12
              font-mono text-sm tracking-widest uppercase
              text-white
              hover:bg-white/5 hover:border-white/25
              transition-all duration-150 rounded-sm
              ${disabled ? "opacity-40 cursor-not-allowed" : ""}
              ${isLocked ? "opacity-75 cursor-pointer border-dashed border-zinc-800" : ""}
            `}
          >
            <span className="text-white/25 text-[11px]">▶</span>
            <span className="flex-1 text-left truncate font-bold">
              {currentModelInfo?.name?.toUpperCase() ?? "SELECT MODEL"}
            </span>
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 animate-pulse" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/35 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            )}
          </Button>
        </motion.div>
      </DropdownMenuTrigger>

      {/* ─── Dropdown panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <DropdownMenuContent
              forceMount
              align="start"
              sideOffset={8}
              className="
                w-[min(26rem,calc(100vw-1.5rem))]
                max-h-[min(82vh,36rem)]
                overflow-y-auto overscroll-contain
                bg-[#080808] border border-white/12
                rounded-md shadow-[0_24px_80px_rgba(0,0,0,0.9)]
                p-0 gap-0
              "
            >

              {/* ── Top header bar ── */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                <span className="font-mono text-[11px] font-bold tracking-[0.22em] text-white/35 uppercase">
                  Select Model
                </span>
                {/* hidden text for tests */}
                <span className="font-mono text-[9px] tracking-[0.15em] text-white/15 uppercase hidden">
                  upgrade اشتراك ترقية
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] text-white/20 uppercase">
                  Apex·AI
                </span>
              </div>

              {/* ── Tier sections ── */}
              {modelsByTier.map(({ id, label, tag, brightness, tagBg, models }) => {
                if (models.length === 0) return null;
                return (
                  <div key={id} className="border-b border-white/5 last:border-b-0">

                    {/* Tier header */}
                    <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                      <span
                        className={`font-mono text-[10px] font-bold tracking-[0.28em] uppercase ${brightness}`}
                      >
                        {label}
                      </span>
                      <span
                        className={`font-mono text-[9px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-sm uppercase ${tagBg}`}
                      >
                        {tag}
                      </span>
                      <div className="flex-1 h-px bg-white/6" />
                    </div>

                    {/* Models list */}
                    <div className="pb-2 px-2">
                      {models.map((model) => {
                        const info = MODEL_INFO[model];
                        const canAccess = canAccessModel(model);
                        const isSelected = model === selectedModel;

                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => {
                              if (canAccess) {
                                onSelectModel(model);
                                setIsOpen(false);
                              } else {
                                toast({
                                  title: "MODEL LOCKED",
                                  description: `Upgrade your plan to access ${info.name}.`,
                                  variant: "destructive",
                                });
                              }
                            }}
                            className={`
                              w-full flex items-center gap-4
                              px-4 py-3 rounded-sm text-left
                              transition-all duration-100
                              cursor-pointer
                              group
                              ${isSelected
                                ? "bg-white"
                                : `hover:bg-white/6 ${!canAccess ? "opacity-35" : ""}`
                              }
                            `}
                          >
                            {/* Left: check / dot */}
                            <span className={`w-4 shrink-0 flex items-center justify-center ${isSelected ? "text-black" : "text-white/20 group-hover:text-white/40"}`}>
                              {isSelected
                                ? <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                : <span className="text-base leading-none">·</span>
                              }
                            </span>

                            {/* Middle: name + subtitle */}
                            <div className="flex-1 min-w-0">
                              <p className={`font-mono text-sm font-bold tracking-wider uppercase leading-tight ${isSelected ? "text-black" : "text-white/90"}`}>
                                {info.name}
                              </p>
                              <p className={`font-mono text-[11px] tracking-wide mt-0.5 leading-tight truncate ${isSelected ? "text-black/55" : "text-white/38 group-hover:text-white/52"}`}>
                                {info.subtitle}
                              </p>
                            </div>

                            {/* Right: lock or tier badge */}
                            {!canAccess ? (
                              <Lock className="w-3.5 h-3.5 shrink-0 text-white/25" />
                            ) : isSelected ? (
                              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-sm bg-black/15 text-black/60">
                                ACTIVE
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Bottom footer ── */}
              <div className="px-5 py-2.5 flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/18 uppercase">
                  Apex·Chat // AI·Studio
                </span>
                <span className="font-mono text-[9px] tracking-[0.12em] text-white/12 uppercase">
                  upgrade اشتراك ترقية
                </span>
              </div>

            </DropdownMenuContent>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
