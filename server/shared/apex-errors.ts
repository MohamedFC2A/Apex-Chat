/**
 * Apex Shared — Unified Error Taxonomy
 *
 * Structured error codes and classes for all Apex subsystems.
 */

export enum ApexErrorCode {
  // Search errors
  SEARCH_ALL_SOURCES_FAILED = "SEARCH_001",
  SEARCH_RATE_LIMITED       = "SEARCH_002",
  SEARCH_TIMEOUT            = "SEARCH_003",
  SEARCH_PARSE_ERROR        = "SEARCH_004",

  // Omni pipeline errors
  OMNI_AGENT_TIMEOUT        = "OMNI_001",
  OMNI_MODEL_UNAVAILABLE    = "OMNI_002",
  OMNI_GRPO_DEGENERATE      = "OMNI_003", // all GRPO samples identical
  MCTS_NO_CONVERGENCE       = "OMNI_004",
  PIPELINE_BUDGET_EXCEEDED  = "OMNI_005",
  OMNI_CIRCUIT_OPEN         = "OMNI_006",

  // Auth errors (bubble up — never suppress)
  AUTH_INVALID_KEY          = "AUTH_001",
  AUTH_RATE_LIMITED         = "AUTH_002",
}

export class ApexError extends Error {
  readonly code: ApexErrorCode;
  readonly context?: Record<string, unknown>;
  readonly isRetryable: boolean;

  constructor(
    code: ApexErrorCode,
    message: string,
    options?: { context?: Record<string, unknown>; isRetryable?: boolean }
  ) {
    super(message);
    this.name = "ApexError";
    this.code = code;
    this.context = options?.context;
    this.isRetryable = options?.isRetryable ?? false;
  }

  toLog(): string {
    return `[${this.code}] ${this.message}${this.context ? ` | ctx=${JSON.stringify(this.context)}` : ""}`;
  }
}

// ── Error Utilities ────────────────────────────────────────────────────────────

export function isAuthError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.response?.status;
  if (status === 401) return true;
  const msg = String(err.message || "").toLowerCase();
  return msg.includes("401") || msg.includes("unauthorized");
}

export function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.response?.status;
  if (status === 429) return true;
  const msg = String(err.message || "").toLowerCase();
  return msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests");
}

export function isAuthOrRateLimitError(err: any): boolean {
  return isAuthError(err) || isRateLimitError(err);
}

export function wrapError(err: any, code: ApexErrorCode): ApexError {
  if (err instanceof ApexError) return err;
  return new ApexError(code, String(err?.message || err), {
    context: { originalError: String(err) },
    isRetryable: !isAuthError(err),
  });
}
