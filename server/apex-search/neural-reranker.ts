/**
 * Apex Search v3 — Neural Reranker
 *
 * Upgrades heuristic scoring with LLM-based cross-encoder reranking.
 *
 * Two modes:
 *   FAST: BM25 + domain trust (heuristic, always-on fallback)
 *   SMART: LLM batch scoring via structured JSON output
 *          (groups 5 results per call → 3 parallel calls)
 *
 * Final ranking: 0.6 × neural_score + 0.4 × rrf_score
 * Activation:    options.deep === true || options.isOmni === true
 */

import type { FederatedResult } from "./federated-search.js";

// ── BM25 Heuristic Scorer (FAST path) ─────────────────────────────────────────

function bm25Score(query: string, text: string, k1 = 1.5, b = 0.75): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTerms.length === 0) return 0;

  const words = text.toLowerCase().split(/\s+/);
  const dl = words.length;
  const avgdl = 150; // approximate average document length

  let score = 0;
  for (const term of queryTerms) {
    const tf = words.filter((w) => w.includes(term)).length;
    if (tf === 0) continue;
    const idf = Math.log(1 + 1); // simplified IDF
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (dl / avgdl));
    score += idf * (numerator / denominator);
  }

  return score;
}

const DOMAIN_TRUST: Record<string, number> = {
  "wikipedia.org": 0.95,
  "britannica.com": 0.90,
  "reuters.com": 0.92,
  "apnews.com": 0.92,
  "bbc.com": 0.88,
  "nature.com": 0.97,
  "arxiv.org": 0.95,
  "github.com": 0.90,
  "stackoverflow.com": 0.85,
  "developer.mozilla.org": 0.93,
  "react.dev": 0.91,
  "who.int": 0.96,
  "nih.gov": 0.97,
  "nasa.gov": 0.95,
  "gov": 0.88,
  "edu": 0.87,
};

function getDomainTrust(url: string): number {
  try {
    const hostname = new URL(url).hostname;
    for (const [pattern, trust] of Object.entries(DOMAIN_TRUST)) {
      if (hostname.includes(pattern)) return trust;
    }
  } catch {}
  return 0.5; // neutral trust
}

export function heuristicRerank(
  query: string,
  results: FederatedResult[]
): FederatedResult[] {
  const scored = results.map((r) => {
    const textToScore = `${r.title} ${r.snippet} ${r.page_content?.slice(0, 500) || ""}`;
    const bm25 = bm25Score(query, textToScore);
    const trust = getDomainTrust(r.link);
    const heuristicScore = bm25 * 0.7 + trust * 30;

    return { ...r, _heuristicScore: heuristicScore };
  });

  return scored
    .sort((a, b) => (b as any)._heuristicScore - (a as any)._heuristicScore)
    .map(({ _heuristicScore, ...r }: any) => r);
}

// ── LLM Neural Reranker (SMART path) ──────────────────────────────────────────

interface LLMScoredResult {
  index: number;
  relevance: number; // 0-10
  reasoning?: string;
}

async function scoreBatch(
  query: string,
  batch: FederatedResult[],
  apiKey: string
): Promise<Map<number, number>> {
  const scoreMap = new Map<number, number>();

  const batchText = batch
    .map(
      (r, i) =>
        `[${i}] Title: "${r.title}"\nSnippet: "${r.snippet.slice(0, 300)}"`
    )
    .join("\n\n");

  const prompt = `You are a search relevance expert. Score each of these search results for the query: "${query}"

Results:
${batchText}

Respond with ONLY a JSON array of objects in this format (no explanation):
[{"index": 0, "relevance": 8}, {"index": 1, "relevance": 3}, ...]

Score 0-10 where 10 = perfectly relevant, 0 = completely irrelevant.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.warn("[Neural Reranker] LLM batch score failed:", response.status);
      return scoreMap;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "[]";

    // Parse JSON (handle both array and {results: [...]} formats)
    let parsed: LLMScoredResult[] = [];
    try {
      const raw = JSON.parse(content);
      parsed = Array.isArray(raw) ? raw : (raw.results || raw.scores || []);
    } catch {
      // Regex fallback for malformed JSON
      const matches = content.matchAll(/"index"\s*:\s*(\d+)\s*,\s*"relevance"\s*:\s*([\d.]+)/g);
      for (const m of matches) {
        parsed.push({ index: parseInt(m[1]), relevance: parseFloat(m[2]) });
      }
    }

    for (const item of parsed) {
      if (typeof item.index === "number" && typeof item.relevance === "number") {
        scoreMap.set(item.index, Math.min(10, Math.max(0, item.relevance)));
      }
    }
  } catch (err: any) {
    console.warn("[Neural Reranker] Batch scoring error:", err.message);
  }

  return scoreMap;
}

/**
 * Neural reranking: LLM-scores results in parallel batches of 5.
 * Falls back to heuristic if LLM unavailable.
 *
 * Final score = 0.6 × neural + 0.4 × rrf_position_score
 */
export async function neuralRerank(
  query: string,
  results: FederatedResult[],
  topN: number = 15
): Promise<FederatedResult[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || results.length === 0) {
    return heuristicRerank(query, results);
  }

  const candidates = results.slice(0, topN);
  const batchSize = 5;
  const batches: FederatedResult[][] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }

  console.log(`[Neural Reranker] Scoring ${candidates.length} results in ${batches.length} batches...`);

  // Score all batches in parallel
  const batchScoreMaps = await Promise.all(
    batches.map((batch, batchIdx) => {
      const offsetBatch = batch.map((r, i) => ({ ...r, _batchIdx: batchIdx * batchSize + i }));
      return scoreBatch(query, batch, apiKey).then((scoreMap) => {
        // Offset indices to global position
        const globalMap = new Map<number, number>();
        scoreMap.forEach((score, localIdx) => {
          globalMap.set(batchIdx * batchSize + localIdx, score);
        });
        return globalMap;
      });
    })
  );

  // Merge all score maps
  const globalScoreMap = new Map<number, number>();
  for (const map of batchScoreMaps) {
    map.forEach((score, idx) => {
      globalScoreMap.set(idx, score);
    });
  }

  // Compute final scores: 0.6 × neural + 0.4 × RRF position
  const scored = candidates.map((result, idx) => {
    const neuralScore = (globalScoreMap.get(idx) ?? 5) / 10; // normalize to 0-1
    const rrfPositionScore = 1 / (RRF_K + idx + 1) * 100; // position-based
    const finalScore = 0.6 * neuralScore * 100 + 0.4 * rrfPositionScore;
    return { ...result, score: Math.round(finalScore) };
  });

  // Sort by final score, keep non-candidates appended at end
  const reranked = scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  const rest = results.slice(topN);

  console.log(
    `[Neural Reranker] Done. Top result: "${reranked[0]?.title?.slice(0, 50)}" score=${reranked[0]?.score}`
  );

  return [...reranked, ...rest];
}

const RRF_K = 60;
