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
    iconGlow: "none",
    activeGlow: "none",
    activeBorder: "rgba(139,92,246,0.7)",
  },
  "apex-unbound": {
    description:
      "Uncensored and specialized for large-scale software engineering and complex logic.",
    iconColor: "#f472b6",
    iconGlow: "none",
    activeGlow: "none",
    activeBorder: "rgba(244,114,182,0.6)",
  },
  "apex-elite": {
    description:
      "Blazing fast web-browsing capabilities with deep fact-checking and live data citations.",
    iconColor: "#22d3ee",
    iconGlow: "none",
    activeGlow: "none",
    activeBorder: "rgba(34,211,238,0.6)",
  },
  "apex-pro": {
    description:
      "The perfect balance of high intelligence and speed optimized for production environments.",
    iconColor: "#34d399",
    iconGlow: "none",
    activeGlow: "none",
    activeBorder: "rgba(52,211,153,0.6)",
  },
  "apex-flash": {
    description:
      "Ultra-low latency model tailored for instantaneous responses and casual daily chats.",
    iconColor: "#fbbf24",
    iconGlow: "none",
    activeGlow: "none",
    activeBorder: "rgba(251,191,36,0.6)",
  },
};

/* ─────────────────────────────────────────────────────────────────
   Custom glossy, specular letter icons per model (no glow)
   ───────────────────────────────────────────────────────────────── */
function LetterIcon({
  letter,
  gradientColors,
}: {
  letter: string;
  gradientColors: [string, string];
}) {
  const gradId = `glossy-grad-${letter}`;
  const glossId = `glossy-overlay-${letter}`;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Shiny Glossy gradient background */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradientColors[0]} />
          <stop offset="100%" stopColor={gradientColors[1]} />
        </linearGradient>
        {/* Glass specular reflection highlight */}
        <linearGradient id={glossId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Glossy rounded background */}
      <rect x="0.5" y="0.5" width="25" height="25" rx="6.5" fill={`url(#${gradId})`} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      
      {/* Light sheen overlay */}
      <path d="M 0.5 7.5 C 0.5 4, 4 0.5, 7.5 0.5 L 18.5 0.5 C 22 0.5, 25.5 4, 25.5 7.5 L 25.5 12.5 C 25.5 12.5, 13 13.5, 0.5 12.5 Z" fill={`url(#${glossId})`} opacity="0.65" />
      
      {/* Specular line */}
      <path d="M 1.5 12 C 9 12.8, 17 12.8, 24.5 12" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      
      {/* The slanting futuristic letter */}
      <text
        x="13.5"
        y="18.2"
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-sans, 'Inter', sans-serif)",
          fontWeight: 900,
          fontSize: "13.5px",
          fill: "#ffffff",
          textShadow: "0px 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {letter}
      </text>
    </svg>
  );
}

function OmniIcon(_props?: any) { return <LetterIcon letter="O" gradientColors={["#8b5cf6", "#d946ef"]} />; }
function UnboundIcon(_props?: any) { return <LetterIcon letter="U" gradientColors={["#ec4899", "#f43f5e"]} />; }
function SearchIcon(_props?: any) { return <LetterIcon letter="S" gradientColors={["#06b6d4", "#0ea5e9"]} />; }
function ProIcon(_props?: any) { return <LetterIcon letter="P" gradientColors={["#10b981", "#059669"]} />; }
function FlashIcon(_props?: any) { return <LetterIcon letter="F" gradientColors={["#f59e0b", "#d97706"]} />; }

const MODEL_ICONS: Record<AIModel, React.FC<{ color?: string; glow?: string }>> = {
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
        <Button
          variant="outline"
          disabled={disabled}
          className={[
            "model-selector-btn h-9 px-3 gap-2.5",
            "min-w-[170px] sm:min-w-[230px] justify-start",
            "bg-[#09090b] border border-white/[0.08]",
            "font-mono text-[11px] tracking-widest uppercase text-white",
            "hover:bg-white/[0.04] hover:border-white/[0.18]",
            "transition-all duration-150 rounded-[6px] active:scale-[0.98]",
            "relative overflow-hidden",
            disabled ? "opacity-40 cursor-not-allowed" : "",
            isLocked ? "opacity-70 cursor-pointer border-dashed border-zinc-700" : "",
          ].join(" ")}
          style={
            !disabled && !isLocked
              ? {
                  borderColor: isOpen ? `${currentCardCfg.iconColor}50` : undefined,
                }
              : {}
          }
        >
          {/* Icon */}
          <span className="shrink-0 relative z-10 opacity-80">
            {(() => {
              const Icon = MODEL_ICONS[selectedModel];
              return <Icon color={currentCardCfg.iconColor} glow="none" />;
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
                style={{
                  background: "#09090b",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  boxShadow:
                    "0 20px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.03)",
                  overflow: "hidden",
                  maxHeight: "min(84vh, 36rem)",
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
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: "rgba(255, 255, 255, 0.01)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#6366f1",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
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
                      fontSize: 8,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.15)",
                      textTransform: "uppercase",
                    }}
                  >
                    APEX·AI
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
                    padding: "10px 14px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    background: "rgba(255, 255, 255, 0.01)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize: 8,
                      letterSpacing: "0.15em",
                      color: "rgba(255,255,255,0.18)",
                      textTransform: "uppercase",
                    }}
                  >
                    APEX-CHAT
                  </span>

                  {/* Upgrade button */}
                  <button
                    type="button"
                    style={{
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: "rgba(139,92,246,0.1)",
                      border: "1px solid rgba(139,92,246,0.3)",
                      color: "#c4b5fd",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.2)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.5)";
                      (e.currentTarget as HTMLButtonElement).style.color = "#e9d5ff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.1)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.3)";
                      (e.currentTarget as HTMLButtonElement).style.color = "#c4b5fd";
                    }}
                  >
                    UPGRADE ترقية
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
          gap: 8,
          padding: "12px 14px 6px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {tier.label}
        </span>

        {/* Flat tier badge */}
        <span
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.5)",
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
            background: "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Model cards */}
      <div style={{ padding: "0 8px 4px" }}>
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
        gap: 12,
        padding: "8px 12px",
        borderRadius: 8,
        textAlign: "left",
        cursor: "pointer",
        position: "relative",
        marginBottom: 4,
        transition: "all 0.15s ease",
        background: isActive
          ? "rgba(255, 255, 255, 0.05)"
          : hovered
          ? "rgba(255, 255, 255, 0.03)"
          : "transparent",
        border: isActive
          ? `1px solid ${cfg.iconColor}50`
          : hovered
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid transparent",
        opacity: !canAccess ? 0.38 : 1,
      }}
    >
      {/* Icon container */}
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: isActive
            ? `radial-gradient(circle, ${cfg.iconColor}22 0%, ${cfg.iconColor}0a 100%)`
            : hovered
            ? `rgba(255,255,255,0.04)`
            : `rgba(255,255,255,0.02)`,
          border: isActive
            ? `1px solid ${cfg.iconColor}30`
            : `1px solid rgba(255,255,255,0.05)`,
          transition: "all 0.15s ease",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Icon color={cfg.iconColor} glow="none" />
      </span>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isActive ? "#ffffff" : "rgba(255,255,255,0.85)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {info.name}
          </p>
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 7.5,
              fontWeight: 650,
              padding: "1px 4.5px",
              borderRadius: 3.5,
              background: isActive ? `${cfg.iconColor}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${isActive ? `${cfg.iconColor}44` : "rgba(255,255,255,0.06)"}`,
              color: isActive ? cfg.iconColor : "rgba(255,255,255,0.4)",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            {model === "apex-flash" ? "LAGUNA-XS" : model === "apex-pro" ? "NEMOTRON-120B" : model === "apex-elite" ? "WEB-SEARCH" : model === "apex-omni" ? "OMNI-10" : "NEMOTRON-550B"}
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 9,
            letterSpacing: "0.02em",
            color: isActive
              ? `${cfg.iconColor}b3`
              : hovered
              ? "rgba(255,255,255,0.4)"
              : "rgba(255,255,255,0.25)",
            margin: "2px 0 0",
            lineHeight: 1.2,
          }}
        >
          {info.subtitle}
        </p>
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
            style={{ width: 12, height: 12, color: "rgba(255,255,255,0.25)" }}
          />
        ) : isActive ? (
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "rgba(255, 255, 255, 0.8)",
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
