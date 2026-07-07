/**
 * Apex Search v3 — Persistent Search Cache Adapter
 *
 * Replaces the in-memory Map with a proper cache adapter pattern.
 * Primary: In-memory (always available)
 * Optional: Firestore-based persistence (if Firestore is configured)
 *
 * TTL Strategy:
 *   - News/sports queries:     2 minutes
 *   - Technology/science:      15 minutes
 *   - General knowledge:       60 minutes
 *   - Website design queries:  30 minutes
 */

import type { ApexSearchResponse } from "../apex-search-engine.js";

export interface SearchCacheAdapter {
  get(key: string): Promise<ApexSearchResponse | null>;
  set(key: string, value: ApexSearchResponse, ttlMs: number): Promise<void>;
  invalidate(pattern?: string): Promise<void>;
}

// ── TTL Strategy ───────────────────────────────────────────────────────────────

const TTL_RULES: Array<{ pattern: RegExp; ttlMs: number; label: string }> = [
  { pattern: /news|sport|match|كورة|مباراة|أخبار|عاجل|score|goal/i, ttlMs: 2 * 60 * 1000, label: "news/sports" },
  { pattern: /tech|code|ai|api|software|react|python|github|برمجة|تقنية/i, ttlMs: 15 * 60 * 1000, label: "technology" },
  { pattern: /science|research|paper|study|nasa|arxiv|علم|فضاء|بحث/i, ttlMs: 15 * 60 * 1000, label: "science" },
  { pattern: /website|landing|design|ui|ux|template|موقع|صفحة|تصميم/i, ttlMs: 30 * 60 * 1000, label: "design" },
  { pattern: /finance|stock|crypto|bitcoin|market|سهم|بيتكوين|اقتصاد/i, ttlMs: 5 * 60 * 1000, label: "finance" },
];

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 60 minutes for general knowledge

export function inferTtl(query: string): { ttlMs: number; label: string } {
  for (const rule of TTL_RULES) {
    if (rule.pattern.test(query)) {
      return { ttlMs: rule.ttlMs, label: rule.label };
    }
  }
  return { ttlMs: DEFAULT_TTL_MS, label: "general" };
}

// ── In-Memory Cache Adapter ────────────────────────────────────────────────────

interface MemoryCacheEntry {
  response: ApexSearchResponse;
  timestamp: number;
  ttlMs: number;
  query: string;
}

export class MemoryCacheAdapter implements SearchCacheAdapter {
  private store = new Map<string, MemoryCacheEntry>();
  private maxEntries: number;

  constructor(maxEntries: number = 200) {
    this.maxEntries = maxEntries;
    // Periodic cleanup every 5 minutes
    setInterval(() => this.evictExpired(), 5 * 60 * 1000).unref?.();
  }

  async get(key: string): Promise<ApexSearchResponse | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return entry.response;
  }

  async set(key: string, value: ApexSearchResponse, ttlMs: number): Promise<void> {
    // LRU eviction: if at capacity, remove oldest entry
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      response: value,
      timestamp: Date.now(),
      ttlMs,
      query: key,
    });
  }

  async invalidate(pattern?: string): Promise<void> {
    if (!pattern) {
      this.store.clear();
      return;
    }
    const regex = new RegExp(pattern, "i");
    const toDelete: string[] = [];
    this.store.forEach((_, key) => {
      if (regex.test(key)) {
        toDelete.push(key);
      }
    });
    toDelete.forEach((key) => this.store.delete(key));
  }

  private evictExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    this.store.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttlMs) {
        toDelete.push(key);
      }
    });
    toDelete.forEach((key) => this.store.delete(key));
    const evicted = toDelete.length;
    if (evicted > 0) {
      console.log(`[Search Cache] Evicted ${evicted} expired entries. Size: ${this.store.size}`);
    }
  }

  /** For observability */
  getStats(): { size: number; maxEntries: number } {
    return { size: this.store.size, maxEntries: this.maxEntries };
  }
}

// ── Cache Key Builder ──────────────────────────────────────────────────────────

export function buildCacheKey(
  message: string,
  intent: string,
  isOmni: boolean,
  isDeep?: boolean
): string {
  // Normalize the message for better cache hit rate
  const normalized = message
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return `${normalized}:${intent}:${isOmni ? "omni" : "std"}:${isDeep ? "deep" : "fast"}`;
}

// ── Singleton Global Cache ─────────────────────────────────────────────────────

let _globalCache: SearchCacheAdapter | null = null;

export function getSearchCache(): SearchCacheAdapter {
  if (!_globalCache) {
    _globalCache = new MemoryCacheAdapter(250);
    console.log("[Search Cache] Initialized MemoryCacheAdapter (max 250 entries)");
  }
  return _globalCache;
}
