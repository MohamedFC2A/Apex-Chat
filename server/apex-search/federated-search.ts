/**
 * Apex Search v3 — Federated Search Layer
 *
 * Queries multiple search engines in parallel and merges results using
 * Reciprocal Rank Fusion (RRF). Provides fallback chain and deduplication.
 *
 * Sources: DuckDuckGo (via Python), Brave Search API, Wikipedia API
 * Fusion: RRF  score(d) = Σ 1 / (k + rank_i(d))  where k=60
 */

export interface FederatedResult {
  title: string;
  link: string;
  snippet: string;
  domain?: string;
  score?: number;
  page_content?: string;
  source?: string; // which engine found it
}

export interface FederatedSearchOptions {
  query: string;
  timeoutMs?: number;
  maxResults?: number;
  language?: string;
}

const RRF_K = 60;

// ── URL Normalization ──────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove UTM and tracking params
    const TRACKING_PARAMS = [
      "utm_source","utm_medium","utm_campaign","utm_content","utm_term",
      "ref","referrer","fbclid","gclid","msclkid","yclid","_ga","source",
    ];
    TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    // Normalize trailing slash
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.hostname}${path}${u.search}`;
  } catch {
    return url;
  }
}

function getDomainName(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Brave Search API ───────────────────────────────────────────────────────────

async function searchBrave(query: string, timeoutMs: number): Promise<FederatedResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");
    url.searchParams.set("search_lang", "en");

    const res = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    const results: FederatedResult[] = (data?.web?.results || []).map((item: any) => ({
      title: String(item.title || ""),
      link: String(item.url || ""),
      snippet: String(item.description || ""),
      domain: getDomainName(String(item.url || "")),
      score: 100,
      source: "brave",
    }));

    console.log(`[Federated Search] Brave: ${results.length} results`);
    return results;
  } catch (err: any) {
    if (err.name !== "AbortError") {
      console.warn("[Federated Search] Brave failed:", err.message);
    }
    return [];
  }
}

// ── Wikipedia API ──────────────────────────────────────────────────────────────

async function searchWikipedia(query: string, timeoutMs: number): Promise<FederatedResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", query);
    url.searchParams.set("srlimit", "5");
    url.searchParams.set("format", "json");
    url.searchParams.set("srprop", "snippet|titlesnippet");
    url.searchParams.set("origin", "*");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "ApexChat/3.0 (research bot)" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    const results: FederatedResult[] = (data?.query?.search || []).map((item: any) => {
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`;
      const cleanSnippet = String(item.snippet || "").replace(/<[^>]+>/g, "");
      return {
        title: String(item.title || ""),
        link: pageUrl,
        snippet: cleanSnippet,
        domain: "en.wikipedia.org",
        score: 120, // Wikipedia always gets a trust boost
        source: "wikipedia",
      };
    });

    console.log(`[Federated Search] Wikipedia: ${results.length} results`);
    return results;
  } catch (err: any) {
    if (err.name !== "AbortError") {
      console.warn("[Federated Search] Wikipedia failed:", err.message);
    }
    return [];
  }
}

// ── Reciprocal Rank Fusion ─────────────────────────────────────────────────────

function reciprocalRankFusion(
  resultLists: FederatedResult[][],
  k: number = RRF_K
): FederatedResult[] {
  const scoreMap = new Map<string, { score: number; result: FederatedResult }>();

  for (const list of resultLists) {
    list.forEach((result, rank) => {
      const normUrl = normalizeUrl(result.link);
      const rrfScore = 1 / (k + rank + 1);
      if (scoreMap.has(normUrl)) {
        scoreMap.get(normUrl)!.score += rrfScore;
      } else {
        scoreMap.set(normUrl, { score: rrfScore, result });
      }
    });
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({ ...entry.result, score: Math.round(entry.score * 10000) }));
}

// ── Language Detection ─────────────────────────────────────────────────────────

function detectArabic(query: string): boolean {
  return /[\u0600-\u06FF]/.test(query);
}

// ── Main Federated Search ──────────────────────────────────────────────────────

/**
 * Runs federated search across multiple engines and returns RRF-merged results.
 * Always includes DDG results from Python (passed in). Optionally queries Brave + Wikipedia.
 */
export function mergeWithFederation(
  ddgResults: FederatedResult[],
  braveResults: FederatedResult[],
  wikiResults: FederatedResult[]
): FederatedResult[] {
  const resultLists: FederatedResult[][] = [];

  if (ddgResults.length > 0) resultLists.push(ddgResults);
  if (braveResults.length > 0) resultLists.push(braveResults);
  if (wikiResults.length > 0) resultLists.push(wikiResults);

  if (resultLists.length === 0) return [];
  if (resultLists.length === 1) return resultLists[0];

  const merged = reciprocalRankFusion(resultLists);

  // Dedup by normalized URL (RRF already handles this, but ensure no dupes remain)
  const seen = new Set<string>();
  return merged.filter((r) => {
    const norm = normalizeUrl(r.link);
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

/**
 * Fetch additional sources (Brave + Wikipedia) in parallel.
 * DDG results are always provided from the Python script.
 */
export async function fetchAdditionalSources(
  query: string,
  timeoutMs: number = 2000
): Promise<{ brave: FederatedResult[]; wikipedia: FederatedResult[] }> {
  const isArabic = detectArabic(query);

  // Wikipedia handles bilingual but mostly English — skip for pure Arabic queries
  const promises: [Promise<FederatedResult[]>, Promise<FederatedResult[]>] = [
    searchBrave(query, timeoutMs),
    isArabic ? Promise.resolve([]) : searchWikipedia(query, timeoutMs),
  ];

  const [brave, wikipedia] = await Promise.all(promises);
  return { brave, wikipedia };
}
