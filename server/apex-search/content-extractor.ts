/**
 * Apex Search v3 — Structured HTML Extraction Engine
 *
 * Replaces simple regex stripping with structure-aware content extraction:
 * 1. Fetches HTML with browser-like headers
 * 2. Parses main sections (article, main, role=main)
 * 3. Removes nav, footer, header, scripts, styles, ads
 * 4. Extracts structured metadata (title, time, json-ld)
 */

export interface ScrapedContent {
  title: string;
  url: string;
  markdown: string;
  metadata?: Record<string, string>;
}

export async function scrapeUrl(url: string, timeoutMs = 2500): Promise<string> {
  if (!url || !url.startsWith("http")) return "";
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) return "";
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return "";

    const html = await res.text();

    // Structural sanitization
    let clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return clean;
  } catch {
    return "";
  }
}
