/**
 * context-sanitizer.ts
 *
 * Strips API keys, PEM private keys, and binary/base64 blobs from strings
 * before they are forwarded to external AI model APIs.
 *
 * This is a defence-in-depth measure. It does NOT replace proper secret
 * management – keys should never enter user-facing data in the first place.
 */

// ---------------------------------------------------------------------------
// Pattern registry
// ---------------------------------------------------------------------------

/**
 * Each entry is a { pattern, replacement } pair.
 * Patterns are applied in order; replacements are logged but never re-logged
 * in detail to avoid printing the secret they matched.
 */
const SANITIZATION_RULES: Array<{ label: string; pattern: RegExp; replacement: string }> = [
  // DeepSeek / OpenAI-style keys  (sk-…)
  {
    label: "OpenAI/DeepSeek API key",
    pattern: /sk-[A-Za-z0-9]{20,}/g,
    replacement: "[REDACTED:API_KEY]",
  },
  // Groq keys  (gsk_…)
  {
    label: "Groq API key",
    pattern: /gsk_[A-Za-z0-9]{20,}/g,
    replacement: "[REDACTED:API_KEY]",
  },
  // Google / Firebase web API keys  (AIza…)
  {
    label: "Google/Firebase API key",
    pattern: /AIza[A-Za-z0-9\-_]{30,}/g,
    replacement: "[REDACTED:API_KEY]",
  },
  // Anthropic keys  (sk-ant-…)
  {
    label: "Anthropic API key",
    pattern: /sk-ant-[A-Za-z0-9\-_]{20,}/g,
    replacement: "[REDACTED:API_KEY]",
  },
  // Generic assignment patterns in .env style  (SOME_KEY=<value>)
  {
    label: ".env variable assignment",
    pattern: /([A-Z][A-Z0-9_]{3,})=(sk-|gsk_|AIza)[A-Za-z0-9\-_+/]{20,}/g,
    replacement: "$1=[REDACTED:API_KEY]",
  },
  // PEM private / certificate blocks
  {
    label: "PEM key block",
    pattern: /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g,
    replacement: "[REDACTED:PEM_BLOCK]",
  },
  // Long raw base64 strings (≥ 80 contiguous base64 chars) – typical of binary
  // artifacts or encoded credentials injected via file reads
  {
    label: "Long base64 blob",
    pattern: /(?:[A-Za-z0-9+/]{80,}={0,2})/g,
    replacement: "[REDACTED:BASE64_BLOB]",
  },
];

// ---------------------------------------------------------------------------
// Excluded patterns (allow-list) – avoid redacting benign long strings
// ---------------------------------------------------------------------------

/**
 * If a matched substring starts with one of these prefixes it is safe and
 * should NOT be redacted.  Use sparingly – the default is deny.
 */
const SAFE_PREFIXES: string[] = [
  "data:image/",   // inline image data URIs used in chat messages
  "https://",      // regular URLs that happen to be long
  "http://",
];

function isSafeMatch(matched: string): boolean {
  return SAFE_PREFIXES.some((prefix) => matched.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Core sanitizer
// ---------------------------------------------------------------------------

/**
 * Sanitize a single string value.
 * Returns the cleaned string and a count of replacements made.
 */
export function sanitizeString(input: string): { output: string; redacted: number } {
  if (!input || typeof input !== "string") {
    return { output: input, redacted: 0 };
  }

  let output = input;
  let redacted = 0;

  for (const rule of SANITIZATION_RULES) {
    // Reset lastIndex for global regexes
    rule.pattern.lastIndex = 0;

    output = output.replace(rule.pattern, (match) => {
      if (isSafeMatch(match)) return match;
      console.warn(
        `[ContextSanitizer] Redacted a "${rule.label}" pattern (${match.length} chars) from context payload.`
      );
      redacted++;
      // Use the rule's replacement, substituting capture groups if present
      return rule.replacement;
    });
  }

  return { output, redacted };
}

// ---------------------------------------------------------------------------
// Higher-level helpers used by the orchestrator
// ---------------------------------------------------------------------------

/**
 * Sanitize a system prompt string.
 */
export function sanitizeSystemPrompt(prompt: string): string {
  const { output, redacted } = sanitizeString(prompt);
  if (redacted > 0) {
    console.error(
      `[ContextSanitizer] ⚠️  ${redacted} secret(s) were stripped from the system prompt. Check how they entered the prompt.`
    );
  }
  return output;
}

/**
 * Sanitize an array of conversation history messages in-place (cloned, not mutated).
 */
export function sanitizeConversationHistory(
  history: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  return history.map((msg) => {
    const { output, redacted } = sanitizeString(msg.content);
    if (redacted > 0) {
      console.warn(
        `[ContextSanitizer] Stripped ${redacted} secret(s) from a ${msg.role} message in conversation history.`
      );
    }
    return { ...msg, content: output };
  });
}

/**
 * Sanitize the user memory context summaries.
 */
export function sanitizeUserMemoryContext(
  context: Array<{ title: string; lastQuery: string; summary?: string; relevance?: number; updatedAt?: number }>
): typeof context {
  return context.map((entry) => {
    const { output: cleanTitle } = sanitizeString(entry.title);
    const { output: cleanQuery } = sanitizeString(entry.lastQuery);
    const { output: cleanSummary } = sanitizeString(entry.summary ?? "");
    return {
      ...entry,
      title: cleanTitle,
      lastQuery: cleanQuery,
      summary: cleanSummary || undefined,
    };
  });
}

/**
 * Convenience wrapper that sanitizes all context fields at once.
 * Returns a sanitized copy of the input objects.
 */
export function sanitizeContextPayload(payload: {
  systemPrompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userMemoryContext?: Array<{ title: string; lastQuery: string; summary?: string; relevance?: number; updatedAt?: number }>;
}): typeof payload {
  return {
    systemPrompt: sanitizeSystemPrompt(payload.systemPrompt),
    conversationHistory: payload.conversationHistory
      ? sanitizeConversationHistory(payload.conversationHistory)
      : undefined,
    userMemoryContext: payload.userMemoryContext
      ? sanitizeUserMemoryContext(payload.userMemoryContext)
      : undefined,
  };
}
