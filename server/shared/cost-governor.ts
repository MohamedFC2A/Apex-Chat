/**
 * Apex Shared — Dynamic Cost Governor
 *
 * Dynamically scales agent count and model tier based on:
 * - Subscription tier (free / pro / enterprise)
 * - Query estimated complexity and cost
 * - User-configurable quality vs. speed preference
 *
 * FREE tier:       Max 5 agents, fast models only, no neural reranker
 * PRO tier:        Max 10 agents, mixed models, smart reranker
 * ENTERPRISE tier: All 16 agents, best models, full pipeline
 */

export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise" | "omni";

export type QualityPreference = "speed" | "balanced" | "quality";

export interface CostGovernorConfig {
  tier: SubscriptionTier;
  qualityPreference?: QualityPreference;
}

export interface GovernorPolicy {
  maxAgents: number;
  allowNeuralReranker: boolean;
  allowDebateAgent: boolean;
  allowMemoryAgent: boolean;
  allowMetaQA: boolean;
  allowCalibrator: boolean;
  modelTier: "flash" | "mixed" | "premium";
  maxSearchResults: number;
  allowFederatedSearch: boolean;
  allowRagFusion: boolean;
  maxTokensPerAgent: number;
  isFullPipeline: boolean;
}

// ── Tier Policies ──────────────────────────────────────────────────────────────

const TIER_POLICIES: Record<SubscriptionTier, GovernorPolicy> = {
  free: {
    maxAgents: 4,
    allowNeuralReranker: false,
    allowDebateAgent: false,
    allowMemoryAgent: false,
    allowMetaQA: false,
    allowCalibrator: false,
    modelTier: "flash",
    maxSearchResults: 10,
    allowFederatedSearch: false,
    allowRagFusion: false,
    maxTokensPerAgent: 1024,
    isFullPipeline: false,
  },
  starter: {
    maxAgents: 6,
    allowNeuralReranker: false,
    allowDebateAgent: false,
    allowMemoryAgent: true,
    allowMetaQA: true,
    allowCalibrator: false,
    modelTier: "flash",
    maxSearchResults: 15,
    allowFederatedSearch: true,
    allowRagFusion: false,
    maxTokensPerAgent: 2048,
    isFullPipeline: false,
  },
  pro: {
    maxAgents: 10,
    allowNeuralReranker: true,
    allowDebateAgent: false,
    allowMemoryAgent: true,
    allowMetaQA: true,
    allowCalibrator: true,
    modelTier: "mixed",
    maxSearchResults: 25,
    allowFederatedSearch: true,
    allowRagFusion: true,
    maxTokensPerAgent: 3000,
    isFullPipeline: false,
  },
  enterprise: {
    maxAgents: 16,
    allowNeuralReranker: true,
    allowDebateAgent: true,
    allowMemoryAgent: true,
    allowMetaQA: true,
    allowCalibrator: true,
    modelTier: "premium",
    maxSearchResults: 35,
    allowFederatedSearch: true,
    allowRagFusion: true,
    maxTokensPerAgent: 4096,
    isFullPipeline: true,
  },
  omni: {
    maxAgents: 16,
    allowNeuralReranker: true,
    allowDebateAgent: true,
    allowMemoryAgent: true,
    allowMetaQA: true,
    allowCalibrator: true,
    modelTier: "premium",
    maxSearchResults: 35,
    allowFederatedSearch: true,
    allowRagFusion: true,
    maxTokensPerAgent: 4096,
    isFullPipeline: true,
  },
};

// ── Quality Preference Modifiers ───────────────────────────────────────────────

function applyQualityPreference(
  policy: GovernorPolicy,
  preference: QualityPreference
): GovernorPolicy {
  switch (preference) {
    case "speed":
      return {
        ...policy,
        maxAgents: Math.min(policy.maxAgents, 4),
        allowNeuralReranker: false,
        allowDebateAgent: false,
        allowCalibrator: false,
        modelTier: "flash",
        maxTokensPerAgent: Math.min(policy.maxTokensPerAgent, 1024),
      };
    case "quality":
      return {
        ...policy,
        // Keep all policy settings — quality mode uses maximum allowed
      };
    case "balanced":
    default:
      return {
        ...policy,
        maxAgents: Math.min(policy.maxAgents, 10),
        allowDebateAgent: false,
        maxTokensPerAgent: Math.min(policy.maxTokensPerAgent, 2048),
      };
  }
}

// ── Main Governor ──────────────────────────────────────────────────────────────

export function getGovernorPolicy(config: CostGovernorConfig): GovernorPolicy {
  const baseTier = config.tier || "free";
  const basePolicy = TIER_POLICIES[baseTier] || TIER_POLICIES.free;
  const preference = config.qualityPreference || "balanced";
  return applyQualityPreference({ ...basePolicy }, preference);
}

// ── Model Selection Helper ─────────────────────────────────────────────────────

export function selectModelForTier(
  agentName: string,
  modelTier: GovernorPolicy["modelTier"],
  isOpenRouter: boolean
): string {
  if (!isOpenRouter) return "deepseek-chat";

  const AGENT_MODEL_MATRIX: Record<string, Record<GovernorPolicy["modelTier"], string>> = {
    "1-Analyst":      { flash: "google/gemini-2.5-flash", mixed: "google/gemini-2.5-flash", premium: "deepseek/deepseek-r1" },
    "4-ExpertWriter": { flash: "google/gemini-2.5-flash", mixed: "google/gemini-2.5-flash", premium: "google/gemini-2.5-pro" },
    "5-CodeSpecialist": { flash: "google/gemini-2.5-flash", mixed: "deepseek/deepseek-chat", premium: "deepseek/deepseek-chat" },
    "6-MathSpecialist": { flash: "google/gemini-2.5-flash", mixed: "deepseek/deepseek-r1", premium: "deepseek/deepseek-r1" },
    "11-Planner":     { flash: "google/gemini-2.5-flash", mixed: "google/gemini-2.5-flash", premium: "deepseek/deepseek-r1" },
    "13-Synthesis":   { flash: "google/gemini-2.5-flash", mixed: "google/gemini-2.5-flash", premium: "google/gemini-2.5-pro" },
    "16-MetaQA":      { flash: "google/gemini-2.5-flash", mixed: "google/gemini-2.5-flash", premium: "deepseek/deepseek-r1" },
  };

  const matrix = AGENT_MODEL_MATRIX[agentName];
  if (matrix) return matrix[modelTier];

  // Default: all other agents use flash
  return "google/gemini-2.5-flash";
}

// ── Tier Detection from Request ────────────────────────────────────────────────

/**
 * Infer subscription tier from the model name used.
 * This is a best-effort mapping for backward compatibility.
 */
export function inferTierFromModel(model: string): SubscriptionTier {
  if (!model) return "free";
  const lower = model.toLowerCase();
  if (lower.includes("omni") || lower.includes("r1") || lower.includes("pro")) return "omni";
  if (lower.includes("flash") || lower.includes("chat")) return "pro";
  return "starter";
}
