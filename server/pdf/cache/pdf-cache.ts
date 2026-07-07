/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — PDF Cache Layer v4.0 (LRU Cache)                             ║
 * ║  In-memory LRU cache for generated PDF buffers and HTML strings          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { PDF_CACHE_TTL_MS, HTML_CACHE_TTL_MS } from "../../../shared/pdf/constants.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs, hits: 0 });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return false; }
    return true;
  }

  delete(key: K): void { this.cache.delete(key); }
  clear(): void { this.cache.clear(); }

  get size(): number { return this.cache.size; }

  get stats() {
    let totalHits = 0;
    this.cache.forEach((e) => { totalHits += e.hits; });
    return { size: this.cache.size, maxSize: this.maxSize, totalHits };
  }
}

class PdfCacheLayer {
  private pdfCache = new LRUCache<string, Buffer>(50, PDF_CACHE_TTL_MS);
  private htmlCache = new LRUCache<string, string>(100, HTML_CACHE_TTL_MS);

  // PDF cache
  getPdf(key: string): Buffer | undefined { return this.pdfCache.get(key); }
  setPdf(key: string, buffer: Buffer): void { this.pdfCache.set(key, buffer); }
  hasPdf(key: string): boolean { return this.pdfCache.has(key); }

  // HTML cache
  getHtml(key: string): string | undefined { return this.htmlCache.get(key); }
  setHtml(key: string, html: string): void { this.htmlCache.set(key, html); }

  // Async wrapper for PDF with auto-generate
  async getOrGeneratePdf(
    key: string,
    generator: () => Promise<Buffer>,
  ): Promise<{ buffer: Buffer; fromCache: boolean }> {
    const cached = this.pdfCache.get(key);
    if (cached) {
      console.log(`[PdfCache] HIT — key: ${key.slice(0, 8)}...`);
      return { buffer: cached, fromCache: true };
    }
    const buffer = await generator();
    this.pdfCache.set(key, buffer);
    console.log(`[PdfCache] MISS — generated & cached: ${key.slice(0, 8)}...`);
    return { buffer, fromCache: false };
  }

  invalidate(key: string): void {
    this.pdfCache.delete(key);
    // HTML cache keys are stored with an "html:" prefix (see cache-key-builder.ts)
    this.htmlCache.delete(key);
    this.htmlCache.delete(`html:${key}`);
  }

  clear(): void {
    this.pdfCache.clear();
    this.htmlCache.clear();
  }

  get stats() {
    return {
      pdf: this.pdfCache.stats,
      html: this.htmlCache.stats,
    };
  }
}

export const pdfCache = new PdfCacheLayer();
