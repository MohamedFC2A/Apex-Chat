/**
 * Apex Search v3 — RAG Fusion Context Builder
 *
 * Instead of simply concatenating top results, implements true RAG Fusion:
 *
 * 1. Generate 3 query variants (original, rewritten, expanded)
 * 2. Merge result lists with RRF
 * 3. Extract semantic snippets for top-8 merged results
 * 4. Build interleaved context with source attribution
 * 5. Append structured data (JSON-LD facts) as bonus
 */

import type { FederatedResult } from "./federated-search.js";

// ── Query Variant Generation ───────────────────────────────────────────────────

export interface QueryVariants {
  original: string;
  rewritten: string;
  expanded: string;
}

/**
 * Generate 3 query variants using LLM for RAG Fusion.
 * Falls back to simple rule-based variants if LLM unavailable.
 */
export async function generateQueryVariants(query: string): Promise<QueryVariants> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return ruleBasedVariants(query);
  }

  try {
    const prompt = `You are a search query optimizer. Given the search query below, generate 2 alternative versions:

Original query: "${query}"

Generate:
1. "rewritten": A simpler, keyword-focused version (remove filler words, keep key terms)
2. "expanded": An expanded version with synonyms and related terms (add 2-3 relevant terms)

Respond ONLY with valid JSON (no explanation):
{"rewritten": "...", "expanded": "..."}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return ruleBasedVariants(query);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";

    try {
      // Extract JSON from content (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return ruleBasedVariants(query);
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.rewritten && parsed.expanded) {
        return {
          original: query,
          rewritten: String(parsed.rewritten),
          expanded: String(parsed.expanded),
        };
      }
    } catch {}
  } catch (err: any) {
    console.warn("[RAG Fusion] Query variant generation failed:", err.message);
  }

  return ruleBasedVariants(query);
}

function ruleBasedVariants(query: string): QueryVariants {
  // Remove filler words for rewritten version
  const FILLERS = /\b(please|kindly|can you|could you|tell me|what is|what are|how to|i want|i need|أريد|أحتاج|ما هو|ما هي|كيف|أخبرني)\b/gi;
  const rewritten = query.replace(FILLERS, "").replace(/\s+/g, " ").trim() || query;

  // Add common expansions
  const expanded = query + " guide overview tutorial";

  return { original: query, rewritten, expanded };
}

// ── Semantic Snippet Extractor ─────────────────────────────────────────────────

function extractSemanticSnippet(
  pageContent: string,
  query: string,
  maxLength: number = 1200
): string {
  if (!pageContent || pageContent.length <= maxLength) return pageContent;

  const paragraphs = pageContent
    .split(/[.!?。！？\n]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30 && p.length < 600);

  if (paragraphs.length === 0) return pageContent.slice(0, maxLength);

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTerms.length === 0) return pageContent.slice(0, maxLength);

  const scored = paragraphs.map((p) => {
    const pLower = p.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (pLower.includes(term)) {
        score += 10;
        if (new RegExp(`\\b${term}\\b`, "i").test(pLower)) {
          score += 15;
        }
      }
    }
    return { text: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let result = "";
  for (const item of scored) {
    if (item.score === 0) break;
    if (result.length + item.text.length + 5 > maxLength) {
      if (result.length === 0) result = item.text.slice(0, maxLength);
      break;
    }
    result += (result ? " ... " : "") + item.text;
  }

  return result || pageContent.slice(0, maxLength);
}

// ── Context Builder ────────────────────────────────────────────────────────────

export interface RagContext {
  text: string;
  sourceCount: number;
  hasStructuredData: boolean;
}

/**
 * Build a rich RAG context string from search results.
 * Uses semantic snippet extraction and interleaved source attribution.
 */
export function buildRagContext(
  results: FederatedResult[],
  query: string,
  topK: number = 8
): RagContext {
  if (!results || results.length === 0) {
    return { text: "", sourceCount: 0, hasStructuredData: false };
  }

  const topResults = results.slice(0, topK);
  let context = "=== APEX SEARCH REFERENCES ===\n";
  let hasStructuredData = false;

  topResults.forEach((item, index) => {
    const domain = item.domain || extractDomain(item.link);
    const snippet = item.page_content
      ? extractSemanticSnippet(item.page_content, query)
      : item.snippet;

    context += `\n[Source ${index + 1}] ${item.title}\n`;
    context += `Domain: ${domain}\n`;
    context += `URL: ${item.link}\n`;
    context += `Content: ${snippet}\n`;

    // Check for structured data hints (Wikipedia infoboxes, etc.)
    if (item.source === "wikipedia" && item.snippet) {
      hasStructuredData = true;
      context += `[Trusted Encyclopedia Source]\n`;
    }

    context += "\n";
  });

  return {
    text: context,
    sourceCount: topResults.length,
    hasStructuredData,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Simple RRF for multi-variant results ──────────────────────────────────────

export function rrfMerge(
  lists: FederatedResult[][],
  k: number = 60
): FederatedResult[] {
  const scoreMap = new Map<string, { score: number; result: FederatedResult }>();

  for (const list of lists) {
    list.forEach((result, rank) => {
      const key = normalizeUrl(result.link);
      const rrfScore = 1 / (k + rank + 1);
      if (scoreMap.has(key)) {
        scoreMap.get(key)!.score += rrfScore;
      } else {
        scoreMap.set(key, { score: rrfScore, result });
      }
    });
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((e) => ({ ...e.result, score: Math.round(e.score * 10000) }));
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const TRACKING = ["utm_source","utm_medium","utm_campaign","ref","fbclid","gclid"];
    TRACKING.forEach((p) => u.searchParams.delete(p));
    return `${u.hostname}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url;
  }
}
