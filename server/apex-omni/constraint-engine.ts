/**
 * Constraint Engine — Apex Omni Engine
 *
 * Implements two real constraint adherence mechanisms:
 *
 * 1. TOKEN-LEVEL LOGIT BIASING
 *    Applies `logit_bias` parameter to the DeepSeek/OpenAI API call.
 *    This directly modifies the log-probability distribution over vocabulary tokens
 *    before sampling, enabling hard penalization of unwanted tokens and
 *    boosting probability of desired structural tokens.
 *
 * 2. GRAMMAR-GUIDED GENERATION
 *    Uses `response_format: { type: "json_object" }` to force the model to
 *    produce valid JSON, mimicking Outlines/Guidance constrained decoding.
 *    Also includes regex-based post-processing validation (structural grammar).
 */

import type OpenAI from "openai";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ConstraintConfig {
  /**
   * Apply logit biasing to steer token probabilities.
   * Keys are token IDs (OpenAI tokenizer), values are bias (-100 to +100).
   * -100 = completely ban, +100 = force token.
   * Practical range: -10 to +10 for subtle steering.
   */
  logitBias?: Record<string, number>;

  /**
   * Force structured JSON output (Grammar-Guided Generation).
   * When true, model MUST output valid JSON.
   */
  forceJsonOutput?: boolean;

  /**
   * JSON Schema to validate the output against (if forceJsonOutput is true).
   */
  outputSchema?: JSONSchema;

  /**
   * Maximum tokens allowed in the constrained output.
   */
  maxTokens?: number;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, { type: string; description?: string; minimum?: number; maximum?: number }>;
  required?: string[];
  description?: string;
}

export interface ConstrainedOutput {
  /** The raw text/JSON string from the model */
  raw: string;
  /** Parsed JSON if forceJsonOutput was true and parsing succeeded */
  parsed?: Record<string, unknown>;
  /** Whether the output passed structural grammar validation */
  grammarValid: boolean;
  /** Applied logit bias keys (for logging) */
  appliedBiasKeys: string[];
}

// ──────────────────────────────────────────────────────────────
// Predefined Logit Bias Profiles
// ──────────────────────────────────────────────────────────────

/**
 * Token IDs for common tokens that should be biased in Apex Omni mode.
 *
 * NOTE: These are approximate token IDs in the DeepSeek/OpenAI cl100k_base tokenizer.
 * The exact IDs depend on the tokenizer used. We apply mild bias values (-5 to +5)
 * to steer generation style rather than hard-forbidding tokens.
 *
 * Negative bias → reduces probability of "lazy" filler tokens
 * Positive bias → increases probability of structured formatting tokens
 */
const APEX_OMNI_LOGIT_BIAS_PROFILE: Record<string, number> = {
  // Discourage "sorry" hedging language
  "40950": -3,   // "sorry" in many tokenizers
  "40018": -3,   // "apologize"
  "40001": -2,   // "cannot"
  // Discourage "I don't know" responses for a premium model
  "33": -2,      // "I" (subtle reduction of first-person hedging)
  // Encourage structured output markers
  "14": +1,      // newline-adjacent (promotes line breaks)
  "482": +1,     // "###" header token
};

const CODING_LOGIT_BIAS_PROFILE: Record<string, number> = {
  ...APEX_OMNI_LOGIT_BIAS_PROFILE,
  // Encourage code block tokens
  "15506": +2,   // "```" backtick sequences
  "2588": +1,    // "typescript"
  "11361": +1,   // "python"
};

const ANALYSIS_LOGIT_BIAS_PROFILE: Record<string, number> = {
  ...APEX_OMNI_LOGIT_BIAS_PROFILE,
  // Encourage analytical structure
  "482": +2,     // headers
  "220": +1,     // bullet points / lists
};

/**
 * Returns the appropriate logit bias profile for the given domain.
 */
export function getLogitBiasProfile(
  domain: string,
  enableBiasing: boolean
): Record<string, number> {
  if (!enableBiasing) return {};
  switch (domain) {
    case "coding":
      return CODING_LOGIT_BIAS_PROFILE;
    case "analysis":
    case "reasoning":
      return ANALYSIS_LOGIT_BIAS_PROFILE;
    default:
      return APEX_OMNI_LOGIT_BIAS_PROFILE;
  }
}

// ──────────────────────────────────────────────────────────────
// Grammar-Guided Output Schemas
// ──────────────────────────────────────────────────────────────

/** Schema for GRPO response evaluation */
export const GRPO_EVALUATION_SCHEMA: JSONSchema = {
  type: "object",
  description: "Structured evaluation of an AI response",
  properties: {
    relevance_score: {
      type: "number",
      description: "How relevant is the response to the query (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    completeness_score: {
      type: "number",
      description: "How complete and thorough is the response (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    accuracy_score: {
      type: "number",
      description: "How factually accurate is the response (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    structure_score: {
      type: "number",
      description: "How well-structured and organized is the response (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    overall_reward: {
      type: "number",
      description: "Combined weighted reward score (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    critique: {
      type: "string",
      description: "Brief critique explaining the scores",
    },
  },
  required: ["relevance_score", "completeness_score", "accuracy_score", "structure_score", "overall_reward"],
};

/** Schema for ToT thought branch evaluation */
export const TOT_THOUGHT_EVALUATION_SCHEMA: JSONSchema = {
  type: "object",
  description: "Evaluation of a thought branch in Tree of Thoughts",
  properties: {
    value_score: {
      type: "number",
      description: "Value of this thought branch (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    is_promising: {
      type: "string",
      description: "Whether this branch is worth exploring further: 'sure', 'maybe', or 'impossible'",
    },
    reasoning: {
      type: "string",
      description: "Brief reasoning for the evaluation",
    },
  },
  required: ["value_score", "is_promising", "reasoning"],
};

/** Schema for MCTS node evaluation */
export const MCTS_NODE_EVALUATION_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    quality_score: {
      type: "number",
      description: "Quality of this response node (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    expansion_potential: {
      type: "number",
      description: "Potential for improvement if expanded (0.0–1.0)",
      minimum: 0,
      maximum: 1,
    },
    reasoning: {
      type: "string",
      description: "Justification for the scores",
    },
  },
  required: ["quality_score", "expansion_potential", "reasoning"],
};

// ──────────────────────────────────────────────────────────────
// Grammar Validator
// ──────────────────────────────────────────────────────────────

/**
 * Validates output against a JSON schema (structural grammar check).
 * This is the TypeScript equivalent of what Outlines/Guidance does at token level.
 */
export function validateOutputGrammar(
  output: string,
  schema: JSONSchema
): { valid: boolean; parsed?: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];

  // Step 1: Parse JSON
  let parsed: Record<string, unknown>;
  try {
    // Handle markdown-wrapped JSON (e.g., ```json ... ```)
    const cleaned = output.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    errors.push("Output is not valid JSON");
    return { valid: false, errors };
  }

  // Step 2: Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in parsed)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Step 3: Type and range validation
  if (schema.properties) {
    for (const [key, def] of Object.entries(schema.properties)) {
      if (key in parsed) {
        const val = parsed[key];
        if (def.type === "number") {
          if (typeof val !== "number") {
            errors.push(`Field '${key}' must be a number, got ${typeof val}`);
          } else {
            if (def.minimum !== undefined && (val as number) < def.minimum) {
              errors.push(`Field '${key}' (${val}) is below minimum (${def.minimum})`);
            }
            if (def.maximum !== undefined && (val as number) > def.maximum) {
              errors.push(`Field '${key}' (${val}) exceeds maximum (${def.maximum})`);
            }
          }
        } else if (def.type === "string" && typeof val !== "string") {
          errors.push(`Field '${key}' must be a string`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    parsed: errors.length === 0 ? parsed : undefined,
    errors,
  };
}

// ──────────────────────────────────────────────────────────────
// Main Constraint API
// ──────────────────────────────────────────────────────────────

/**
 * Builds OpenAI-compatible API parameters with constraint enforcement.
 * This is the core of Token-Level Logit Biasing + Grammar-Guided Generation.
 */
export function buildConstrainedAPIParams(config: ConstraintConfig): {
  logit_bias?: Record<string, number>;
  response_format?: { type: "text" | "json_object" };
  max_tokens?: number;
} {
  const params: ReturnType<typeof buildConstrainedAPIParams> = {};

  // Apply logit bias if provided and non-empty
  if (config.logitBias && Object.keys(config.logitBias).length > 0) {
    params.logit_bias = config.logitBias;
  }

  // Apply grammar-guided generation (JSON mode)
  if (config.forceJsonOutput) {
    params.response_format = { type: "json_object" };
  }

  if (config.maxTokens) {
    params.max_tokens = config.maxTokens;
  }

  return params;
}

/**
 * Validates and repairs constrained output.
 * If JSON validation fails, attempts a best-effort repair.
 */
export function processConstrainedOutput(
  raw: string,
  config: ConstraintConfig
): ConstrainedOutput {
  const appliedBiasKeys = Object.keys(config.logitBias || {});

  if (!config.forceJsonOutput) {
    return { raw, grammarValid: true, appliedBiasKeys };
  }

  if (config.outputSchema) {
    const { valid, parsed, errors } = validateOutputGrammar(raw, config.outputSchema);

    if (!valid) {
      console.warn("[ConstraintEngine] Grammar validation failed:", errors);
      // Attempt best-effort repair: extract any JSON-like content
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const repairResult = validateOutputGrammar(jsonMatch[0], config.outputSchema);
        if (repairResult.valid) {
          return { raw: jsonMatch[0], parsed: repairResult.parsed, grammarValid: true, appliedBiasKeys };
        }
      }
      return { raw, grammarValid: false, appliedBiasKeys };
    }

    return { raw, parsed, grammarValid: true, appliedBiasKeys };
  }

  // No schema, just try to parse
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { raw, parsed, grammarValid: true, appliedBiasKeys };
  } catch {
    return { raw, grammarValid: false, appliedBiasKeys };
  }
}
