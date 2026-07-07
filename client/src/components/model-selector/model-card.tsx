import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIModel } from "@shared/schema";
import { getModelCardConfig } from "@/lib/tier-tokens";
import { ModelLetterIcon } from "@/components/model-letter-icon";

export interface ModelCardProps {
  model: AIModel;
  isSelected: boolean;
  canAccess: boolean;
  onSelect: (model: AIModel) => void;
  onLocked: (name: string) => void;
}

export function ModelCard({
  model,
  isSelected,
  canAccess,
  onSelect,
  onLocked,
}: ModelCardProps) {
  const [hovered, setHovered] = useState(false);
  const cfg = getModelCardConfig(model);

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (canAccess) {
          onSelect(model);
        } else {
          onLocked(cfg.name);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={canAccess ? { scale: 0.98 } : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left cursor-pointer relative mb-1",
        "transition-all duration-150",
        !canAccess && "opacity-40 cursor-not-allowed",
        // Active state
        isSelected && "bg-white/[0.06]",
        // Hover state (only when not selected for better contrast)
        !isSelected && hovered && "bg-white/[0.03]",
      )}
      style={{
        border: isSelected
          ? `1px solid hsl(var(--tier-${cfg.tierCssKey}-accent) / 0.35)`
          : hovered
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid transparent",
      }}
    >
      {/* Icon container */}
      <span
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 relative z-[1]",
        )}
        style={{
          background: isSelected
            ? `radial-gradient(circle, hsl(var(--tier-${cfg.tierCssKey}-accent) / 0.15) 0%, hsl(var(--tier-${cfg.tierCssKey}-accent) / 0.04) 100%)`
            : hovered
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.02)",
          border: isSelected
            ? `1px solid hsl(var(--tier-${cfg.tierCssKey}-accent) / 0.2)`
            : "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <ModelLetterIcon model={model} size={26} />
      </span>

      {/* Text block */}
      <div className="flex-1 min-w-0 relative z-[1]">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "font-mono text-[11px] font-bold tracking-[0.08em] uppercase leading-tight m-0",
              isSelected ? "text-white" : "text-white/85",
            )}
          >
            {cfg.name}
          </p>
          <span
            className={cn(
              "font-mono text-[7.5px] font-semibold px-1 py-px rounded leading-none whitespace-nowrap",
            )}
            style={{
              background: isSelected
                ? `hsl(var(--tier-${cfg.tierCssKey}-accent) / 0.15)`
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${
                isSelected
                  ? `hsl(var(--tier-${cfg.tierCssKey}-accent) / 0.3)`
                  : "rgba(255,255,255,0.06)"
              }`,
              color: isSelected
                ? `hsl(var(--tier-${cfg.tierCssKey}-accent))`
                : "rgba(255,255,255,0.4)",
            }}
          >
            {cfg.techTag}
          </span>
        </div>
        <p
          className={cn(
            "font-sans text-[9px] leading-snug m-0 mt-0.5",
          )}
          style={{
            color: isSelected
              ? `hsl(var(--tier-${cfg.tierCssKey}-accent) / 0.72)`
              : hovered
              ? "rgba(255,255,255,0.4)"
              : "rgba(255,255,255,0.25)",
          }}
        >
          {cfg.subtitle}
        </p>
      </div>

      {/* Right badge / lock */}
      <div className="shrink-0 flex items-center relative z-[1]">
        {!canAccess ? (
          <Lock className="w-3 h-3 text-white/25" />
        ) : isSelected ? (
          <span
            className="font-mono text-[8px] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded text-white/80"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            ACTIVE
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}
