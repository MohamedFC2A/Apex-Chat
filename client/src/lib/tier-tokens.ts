import type { AIModel } from "@shared/schema";
import { MODEL_INFO, MODEL_TIER_MAP } from "@/lib/constants";

/* ─────────────────────────────────────────────────────────────────
   Tier Token System — Centralized design tokens for model tiers
   Eliminates inline colors; everything flows from CSS variables
───────────────────────────────────────────────────────────────── */

export type TierId = "starter" | "pro" | "elite" | "omni";

export interface TierConfig {
  id: TierId;
  label: string;
  tag: string;
  /** CSS variable suffix for tier colors, e.g. "omni" → hsl(var(--tier-omni-accent)) */
  cssVarKey: string;
}

export interface ModelCardConfig {
  model: AIModel;
  name: string;
  subtitle: string;
  description: string;
  techTag: string;
  tierId: TierId;
  /** CSS variable key for the tier this model belongs to */
  tierCssKey: string;
  /** Badge variant class */
  badgeStyle: "omni" | "elite" | "pro" | "starter";
}

/* ── Tier Definitions ─────────────────────────────────────────── */
export const TIERS: TierConfig[] = [
  {
    id: "omni",
    label: "OMNI",
    tag: "TIER 4",
    cssVarKey: "omni",
  },
  {
    id: "elite",
    label: "ELITE",
    tag: "TIER 3",
    cssVarKey: "elite",
  },
  {
    id: "pro",
    label: "PRO",
    tag: "TIER 2",
    cssVarKey: "pro",
  },
  {
    id: "starter",
    label: "STARTER",
    tag: "TIER 1",
    cssVarKey: "starter",
  },
] as const;

/* ── Model Card Configurations ────────────────────────────────── */
export const MODEL_CARD_CONFIGS: Record<AIModel, ModelCardConfig> = {
  "apex-omni": {
    model: "apex-omni",
    name: MODEL_INFO["apex-omni"].name,
    subtitle: MODEL_INFO["apex-omni"].subtitle,
    description:
      "Our flagship dodeca-core cognitive engine. Hyper-complex reasoning, deep logical chains, AGI-grade multi-agent cognition.",
    techTag: "OMNI-12",
    tierId: "omni",
    tierCssKey: "omni",
    badgeStyle: "omni",
  },
  "apex-coder": {
    model: "apex-coder",
    name: MODEL_INFO["apex-coder"].name,
    subtitle: MODEL_INFO["apex-coder"].subtitle,
    description:
      "Autonomous code generation engine. Builds complete full-stack applications from a single prompt with elite UI/UX.",
    techTag: "CODE-ENGINE",
    tierId: "omni",
    tierCssKey: "omni",
    badgeStyle: "omni",
  },
  "apex-elite": {
    model: "apex-elite",
    name: MODEL_INFO["apex-elite"].name,
    subtitle: MODEL_INFO["apex-elite"].subtitle,
    description:
      "Blazing fast web-browsing capabilities with deep fact-checking and live data citations.",
    techTag: "WEB-SEARCH",
    tierId: "elite",
    tierCssKey: "elite",
    badgeStyle: "elite",
  },
  "apex-flash": {
    model: "apex-flash",
    name: MODEL_INFO["apex-flash"].name,
    subtitle: MODEL_INFO["apex-flash"].subtitle,
    description:
      "Ultra-low latency model tailored for instantaneous responses and casual daily chats.",
    techTag: "LAGUNA-XS",
    tierId: "starter",
    tierCssKey: "starter",
    badgeStyle: "starter",
  },
};

/* ── Helpers ───────────────────────────────────────────────────── */

/** Get the tier config for a given model */
export function getTierForModel(model: AIModel): TierConfig {
  const tierId = MODEL_TIER_MAP[model];
  return TIERS.find((t) => t.id === tierId) ?? TIERS[TIERS.length - 1];
}

/** Get the model card config for a given model */
export function getModelCardConfig(model: AIModel): ModelCardConfig {
  return MODEL_CARD_CONFIGS[model];
}

/** Get all models grouped by tier */
export function getModelsByTier(): (TierConfig & { models: AIModel[] })[] {
  const { MODELS } = require("@/lib/constants");
  return TIERS.map((tier) => ({
    ...tier,
    models: (MODELS as AIModel[]).filter((m) => MODEL_TIER_MAP[m] === tier.id),
  }));
}

/**
 * Build a Tailwind-compatible tier color class.
 * Example: `tierColor("omni", "accent")` → "bg-tier-omni"
 *          `tierColor("elite", "text")`   → "text-tier-elite-text"
 */
export function tierCssClass(tierCssKey: string, variant: "accent" | "surface" | "border" | "text"): string {
  const prefix = variant === "accent" ? "" : `-${variant}`;
  return `tier-${tierCssKey}${prefix}`;
}

/**
 * Returns the raw HSL CSS variable reference for a tier color.
 * Example: `tierHslVar("omni", "accent")` → "hsl(var(--tier-omni-accent))"
 */
export function tierHslVar(tierCssKey: string, variant: "accent" | "surface" | "border" | "text"): string {
  return `hsl(var(--tier-${tierCssKey}-${variant}))`;
}
