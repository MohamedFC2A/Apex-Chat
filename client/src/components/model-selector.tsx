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
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  disabled?: boolean;
  isLocked?: boolean;
}

/* ─────────────────────────────────────────────────────────────────
   Tier configuration with holographic/gradient palette
───────────────────────────────────────────────────────────────── */
const TIERS = [
  {
    id: "omni",
    label: "OMNI",
    tag: "TIER 4",
    /* electric indigo → violet gradient */
    badgeGradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #818cf8 100%)",
    badgeShadow: "0 0 12px rgba(139,92,246,0.55)",
    labelColor: "#e0e7ff",
    dividerColor: "rgba(99,102,241,0.25)",
  },
  {
    id: "elite",
    label: "ELITE",
    tag: "TIER 3",
    /* deep cyan → teal */
    badgeGradient: "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #22d3ee 100%)",
    badgeShadow: "0 0 10px rgba(6,182,212,0.45)",
    labelColor: "#a5f3fc",
    dividerColor: "rgba(6,182,212,0.2)",
  },
  {
    id: "pro",
    label: "PRO",
    tag: "TIER 2",
    /* emerald → lime */
    badgeGradient: "linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)",
    badgeShadow: "0 0 10px rgba(16,185,129,0.40)",
    labelColor: "#6ee7b7",
    dividerColor: "rgba(16,185,129,0.18)",
  },
  {
    id: "starter",
    label: "STARTER",
    tag: "TIER 1",
    /* amber → orange */
    badgeGradient: "linear-gradient(135deg, #f59e0b 0%, #fb923c 50%, #fbbf24 100%)",
    badgeShadow: "0 0 8px rgba(245,158,11,0.35)",
    labelColor: "#fde68a",
    dividerColor: "rgba(245,158,11,0.15)",
  },
] as const;

type TierConfig = (typeof TIERS)[number];

/* ─────────────────────────────────────────────────────────────────
   Model-specific icon + accent color map
───────────────────────────────────────────────────────────────── */
const MODEL_CARD_CONFIG: Record<
  AIModel,
  {
    description: string;
    iconColor: string;
    iconGlow: string;
    activeGlow: string;
    activeBorder: string;
  }
> = {
  "apex-omni": {
    description:
      "Our most advanced model. Excels at hyper-complex reasoning, math, and deep creative analysis.",
    iconColor: "#a78bfa",
    iconGlow: "drop-shadow(0 0 8px rgba(167,139,250,0.8))",
    activeGlow:
      "0 0 0 1px rgba(139,92,246,0.6), 0 0 24px rgba(139,92,246,0.2), inset 0 0 24px rgba(99,102,241,0.06)",
    activeBorder: "rgba(139,92,246,0.7)",
  },
  "apex-unbound": {
    description:
      "Uncensored and specialized for large-scale software engineering and complex logic.",
    iconColor: "#f472b6",
    iconGlow: "drop-shadow(0 0 8px rgba(244,114,182,0.8))",
    activeGlow:
      "0 0 0 1px rgba(244,114,182,0.5), 0 0 24px rgba(244,114,182,0.15)",
    activeBorder: "rgba(244,114,182,0.6)",
  },
  "apex-elite": {
    description:
      "Blazing fast web-browsing capabilities with deep fact-checking and live data citations.",
    iconColor: "#22d3ee",
    iconGlow: "drop-shadow(0 0 8px rgba(34,211,238,0.8))",
    activeGlow:
      "0 0 0 1px rgba(34,211,238,0.5), 0 0 24px rgba(34,211,238,0.15)",
    activeBorder: "rgba(34,211,238,0.6)",
  },
  "apex-pro": {
    description:
      "The perfect balance of high intelligence and speed optimized for production environments.",
    iconColor: "#34d399",
    iconGlow: "drop-shadow(0 0 8px rgba(52,211,153,0.8))",
    activeGlow:
      "0 0 0 1px rgba(52,211,153,0.5), 0 0 24px rgba(52,211,153,0.15)",
    activeBorder: "rgba(52,211,153,0.6)",
  },
  "apex-flash": {
    description:
      "Ultra-low latency model tailored for instantaneous responses and casual daily chats.",
    iconColor: "#fbbf24",
    iconGlow: "drop-shadow(0 0 8px rgba(251,191,36,0.8))",
    activeGlow:
      "0 0 0 1px rgba(251,191,36,0.5), 0 0 24px rgba(251,191,36,0.15)",
    activeBorder: "rgba(251,191,36,0.6)",
  },
};

/* ─────────────────────────────────────────────────────────────────
   Custom glowing SVG icons per model
───────────────────────────────────────────────────────────────── */
function OmniIcon({ color, glow }: { color: string; glow: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" style={{ filter: glow }}>
      <circle cx="13" cy="13" r="11" stroke={color} strokeWidth="1.2" opacity="0.35" />
      <circle cx="13" cy="13" r="6" stroke={color} strokeWidth="1.4" opacity="0.6" />
      <circle cx="13" cy="13" r="2.5" fill={color} opacity="0.9" />
      <line x1="13" y1="2" x2="13" y2="6.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="19.5" x2="13" y2="24" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="13" x2="6.5" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19.5" y1="13" x2="24" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="13" cy="13" r="10" stroke={color} strokeWidth="0.4" strokeDasharray="2 3" opacity="0.4" />
    </svg>
  );
}

function UnboundIcon({ color, glow }: { color: string; glow: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" style={{ filter: glow }}>
      <path d="M4 8h18M4 13h12M4 18h9" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      <path d="M19 15l4-4-4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <rect x="2" y="5" width="22" height="16" rx="3" stroke={color} strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

function SearchIcon({ color, glow }: { color: string; glow: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" style={{ filter: glow }}>
      <circle cx="11" cy="11" r="7.5" stroke={color} strokeWidth="1.8" opacity="0.9" />
      <line x1="16.8" y1="16.8" x2="23" y2="23" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11h6M11 8v6" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <circle cx="11" cy="11" r="3" fill={color} opacity="0.15" />
    </svg>
  );
}

function ProIcon({ color, glow }: { color: string; glow: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" style={{ filter: glow }}>
      <polygon points="13,2 16,10 24,10 18,15.5 20,24 13,19 6,24 8,15.5 2,10 10,10" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill={color} fillOpacity="0.12" opacity="0.9" />
      <polygon points="13,6 15,12 21,12 16,16 18,22 13,18.5 8,22 10,16 5,12 11,12" fill={color} opacity="0.35" />
    </svg>
  );
}

function FlashIcon({ color, glow }: { color: string; glow: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" style={{ filter: glow }}>
      <path d="M15 2L5 15h8l-2 9 10-13h-8L15 2z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill={color} fillOpacity="0.2" opacity="0.95" />
      <path d="M13 10l-3 5h5l-3 6" stroke={color} strokeWidth="0.8" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

const MODEL_ICONS: Record<AIModel, React.FC<{ color: string; glow: string }>> = {
  "apex-omni": OmniIcon,
  "apex-unbound": UnboundIcon,
  "apex-elite": SearchIcon,
  "apex-pro": ProIcon,
  "apex-flash": FlashIcon,
};

/* ─────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────── */
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
  const currentCardCfg = MODEL_CARD_CONFIG[selectedModel];

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
        <motion.div
          whileHover={disabled ? {} : { scale: 1.015 }}
          whileTap={disabled ? {} : { scale: 0.985 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Button
            variant="outline"
            disabled={disabled}
            className={[
              "model-selector-btn h-9 px-3 gap-2.5",
              "min-w-[170px] sm:min-w-[230px] justify-start",
              "bg-[#09090b] border border-white/[0.08]",
              "font-mono text-[11px] tracking-widest uppercase text-white",
              "hover:bg-white/[0.04] hover:border-white/[0.18]",
              "transition-all duration-200 rounded-[6px]",
              "relative overflow-hidden",
              disabled ? "opacity-40 cursor-not-allowed" : "",
              isLocked ? "opacity-70 cursor-pointer border-dashed border-zinc-700" : "",
            ].join(" ")}
            style={
              !disabled && !isLocked
                ? {
                    boxShadow: isOpen
                      ? `0 0 0 1px ${currentCardCfg.activeBorder}, 0 0 16px ${currentCardCfg.activeBorder}33`
                      : "none",
                    borderColor: isOpen ? currentCardCfg.activeBorder : undefined,
                  }
                : {}
            }
          >
            {/* Animated shimmer strip */}
            {isOpen && (
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${currentCardCfg.iconColor}08 50%, transparent 100%)`,
                }}
              />
            )}

            {/* Icon */}
            <span className="shrink-0 relative z-10 opacity-80">
              {(() => {
                const Icon = MODEL_ICONS[selectedModel];
                return <Icon color={currentCardCfg.iconColor} glow={currentCardCfg.iconGlow} />;
              })()}
            </span>

            {/* Label */}
            <span className="flex-1 text-left truncate font-bold relative z-10" style={{ color: "#e2e8f0" }}>
              {currentModelInfo?.name?.toUpperCase() ?? "SELECT MODEL"}
            </span>

            {/* Right icon */}
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 animate-pulse relative z-10" />
            ) : (
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 shrink-0 relative z-10 ${isOpen ? "rotate-180" : ""}`}
              />
            )}
          </Button>
        </motion.div>
      </DropdownMenuTrigger>

      {/* ─── Dropdown Panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <DropdownMenuContent
              forceMount
              align="start"
              sideOffset={8}
              className="p-0 gap-0 border-0 bg-transparent shadow-none"
              style={{ width: "min(28rem, calc(100vw - 1.5rem))" }}
            >
              {/* Outer shell */}
              <div
                style={{
                  background: "#09090b",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "12px",
                  boxShadow:
                    "0 32px 96px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)",
                  overflow: "hidden",
                  maxHeight: "min(84vh, 38rem)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* ── Header bar ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Pulsing dot */}
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#6366f1",
                        boxShadow: "0 0 8px rgba(99,102,241,0.8)",
                        animation: "pulse 2s ease-in-out infinite",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        color: "rgba(255,255,255,0.3)",
                        textTransform: "uppercase",
                      }}
                    >
                      SELECT MODEL
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize: 9,
                      letterSpacing: "0.18em",
                      color: "rgba(255,255,255,0.15)",
                      textTransform: "uppercase",
                    }}
                  >
                    APEX·AI·STUDIO
                  </span>
                </div>

                {/* ── Scrollable tier sections ── */}
                <div style={{ overflowY: "auto", overscrollBehavior: "contain", flexGrow: 1 }}>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 18px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    background:
                      "linear-gradient(0deg, rgba(255,255,255,0.018) 0%, transparent 100%)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      color: "rgba(255,255,255,0.18)",
                      textTransform: "uppercase",
                    }}
                  >
                    APEX-CHAT // AI-STUDIO
                  </span>

                  {/* Upgrade button */}
                  <button
                    type="button"
                    style={{
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: 5,
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.25) 100%)",
                      border: "1px solid rgba(139,92,246,0.4)",
                      color: "#c4b5fd",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 0 10px rgba(139,92,246,0.15)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "linear-gradient(135deg, rgba(99,102,241,0.45) 0%, rgba(168,85,247,0.45) 100%)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 0 16px rgba(139,92,246,0.4)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(139,92,246,0.7)";
                      (e.currentTarget as HTMLButtonElement).style.color = "#e9d5ff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.25) 100%)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 0 10px rgba(139,92,246,0.15)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(139,92,246,0.4)";
                      (e.currentTarget as HTMLButtonElement).style.color = "#c4b5fd";
                    }}
                  >
                    UPGRADE إشتراك ترقية
                  </button>
                </div>
              </div>
            </DropdownMenuContent>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Tier Section sub-component
───────────────────────────────────────────────────────────────── */
function TierSection({
  tier,
  models,
  selectedModel,
  canAccessModel,
  onSelect,
  onLocked,
}: {
  tier: TierConfig & { models: AIModel[] };
  models: AIModel[];
  selectedModel: AIModel;
  canAccessModel: (m: AIModel) => boolean;
  onSelect: (m: AIModel) => void;
  onLocked: (name: string) => void;
}) {
  return (
    <div
      style={{
        borderBottom: `1px solid rgba(255,255,255,0.04)`,
        paddingBottom: 4,
      }}
      className="last:border-b-0"
    >
      {/* Tier header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px 8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: tier.labelColor,
          }}
        >
          {tier.label}
        </span>

        {/* Holographic tier badge */}
        <span
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "3px 9px",
            borderRadius: 20,
            background: tier.badgeGradient,
            boxShadow: tier.badgeShadow,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {tier.tag}
        </span>

        {/* Divider line */}
        <div
          style={{
            flex: 1,
            height: 1,
            background: `linear-gradient(90deg, ${tier.dividerColor} 0%, transparent 100%)`,
          }}
        />
      </div>

      {/* Model cards */}
      <div style={{ padding: "0 10px 6px" }}>
        {models.map((model) => (
          <ModelCard
            key={model}
            model={model}
            isSelected={model === selectedModel}
            canAccess={canAccessModel(model)}
            onSelect={onSelect}
            onLocked={onLocked}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Model Card sub-component
───────────────────────────────────────────────────────────────── */
function ModelCard({
  model,
  isSelected,
  canAccess,
  onSelect,
  onLocked,
}: {
  model: AIModel;
  isSelected: boolean;
  canAccess: boolean;
  onSelect: (m: AIModel) => void;
  onLocked: (name: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const info = MODEL_INFO[model];
  const cfg = MODEL_CARD_CONFIG[model];
  const Icon = MODEL_ICONS[model];

  const isActive = isSelected;
  const show = isActive || hovered;

  return (
    <button
      type="button"
      onClick={() => {
        if (canAccess) {
          onSelect(model);
        } else {
          onLocked(info.name);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "11px 12px",
        borderRadius: 9,
        textAlign: "left",
        cursor: "pointer",
        position: "relative",
        marginBottom: 3,
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        background: isActive
          ? `linear-gradient(135deg, ${cfg.iconColor}12 0%, ${cfg.iconColor}06 100%)`
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "transparent",
        border: isActive
          ? `1px solid ${cfg.activeBorder}`
          : hovered
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid transparent",
        boxShadow: isActive ? cfg.activeGlow : "none",
        opacity: !canAccess ? 0.38 : 1,
      }}
    >
      {/* Glow shimmer overlay on active */}
      {isActive && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 9,
            background: `radial-gradient(ellipse at 20% 50%, ${cfg.iconColor}0a 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Icon container */}
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: isActive
            ? `radial-gradient(circle, ${cfg.iconColor}22 0%, ${cfg.iconColor}0a 100%)`
            : show
            ? `rgba(255,255,255,0.04)`
            : `rgba(255,255,255,0.025)`,
          border: isActive
            ? `1px solid ${cfg.iconColor}40`
            : `1px solid rgba(255,255,255,0.06)`,
          transition: "all 0.2s ease",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Icon color={cfg.iconColor} glow={show ? cfg.iconGlow : "none"} />
      </span>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <p
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isActive ? "#f1f5f9" : "rgba(255,255,255,0.82)",
            lineHeight: 1.2,
            margin: 0,
            transition: "color 0.15s ease",
          }}
        >
          {info.name}
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 10,
            letterSpacing: "0.05em",
            color: isActive
              ? `${cfg.iconColor}cc`
              : hovered
              ? "rgba(255,255,255,0.45)"
              : "rgba(255,255,255,0.30)",
            margin: "3px 0 0",
            lineHeight: 1.3,
            transition: "color 0.15s ease",
          }}
        >
          {info.subtitle}
        </p>
        {/* Description */}
        {show && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              fontFamily:
                "var(--font-sans, 'Inter', -apple-system, sans-serif)",
              fontSize: 10.5,
              color: isActive
                ? "rgba(255,255,255,0.55)"
                : "rgba(255,255,255,0.38)",
              margin: "5px 0 0",
              lineHeight: 1.5,
              overflow: "hidden",
            }}
          >
            {cfg.description}
          </motion.p>
        )}
      </div>

      {/* Right badge / lock */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {!canAccess ? (
          <Lock
            style={{ width: 14, height: 14, color: "rgba(255,255,255,0.22)" }}
          />
        ) : isActive ? (
          <span
            style={{
              fontFamily:
                "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 20,
              background: `linear-gradient(135deg, ${cfg.iconColor}50 0%, ${cfg.iconColor}30 100%)`,
              border: `1px solid ${cfg.iconColor}60`,
              color: cfg.iconColor,
              boxShadow: `0 0 10px ${cfg.iconColor}40`,
              whiteSpace: "nowrap",
            }}
          >
            ACTIVE
          </span>
        ) : null}
      </div>
    </button>
  );
}
