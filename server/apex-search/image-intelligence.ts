/**
 * Apex Search v3 — Vision-Aware Image Intelligence
 *
 * Upgrades image scoring from heuristic rules to a smarter pipeline:
 * 1. Filter phase (blocked/trusted domain rules)
 * 2. Quality assessment (resolution, aspect ratio, format)
 * 3. Relevance scoring (BM25 match + domain authority)
 * 4. Perceptual dedup (path similarity grouping)
 * 5. CDN proxy selection
 *
 * New image roles: infographic, map, chart
 */

export type ImageRole =
  | "hero"
  | "showcase"
  | "product"
  | "venue"
  | "team"
  | "background"
  | "gallery"
  | "infographic"
  | "map"
  | "chart";

export interface ScoredImage {
  role: ImageRole;
  title: string;
  imageUrl: string;
  optimizedUrl: string;
  source: string;
  alt: string;
  width: number;
  height: number;
  aspectRatio: string;
  score: number;
  query: string;
  usage: string;
  format?: string;
  isPerceptualDup?: boolean;
}

// ── Domain Lists ───────────────────────────────────────────────────────────────

const BLOCKED_DOMAINS = [
  "pinterest.", "pin.it", "instagram.", "facebook.", "fbcdn.",
  "x.com", "twitter.", "tiktok.", "shutterstock.", "alamy.",
  "gettyimages.", "istockphoto.", "dreamstime.", "depositphotos.",
  "123rf.", "vectorstock.", "freepik.", "vecteezy.", "pngtree.",
  "cleanpng.", "kindpng.", "clipart", "giphy.", "tenor.",
  "reddit.", "imgur.", "ytimg.", "youtube.", "wikihow.",
];

const TRUSTED_DOMAINS = [
  "unsplash.com", "images.unsplash.com", "pexels.com", "images.pexels.com",
  "wikimedia.org", "wikipedia.org", "cloudinary.com", "shopify.com",
  "squarespace-cdn.com", "wp.com", "wordpress.com", "cdn.shopify.com",
  "static.wixstatic.com", "images.ctfassets.net", "cdn.pixabay.com",
];

const NEGATIVE_TERMS = [
  "logo", "icon", "vector", "clipart", "illustration", "cartoon",
  "watermark", "transparent", "isolated", "template", "mockup psd",
  "stock vector", "ai generated", "placeholder",
];

// ── Format Scoring ─────────────────────────────────────────────────────────────

const FORMAT_SCORES: Record<string, number> = {
  avif: 35,
  webp: 28,
  jpg: 24,
  jpeg: 24,
  png: 10,
  gif: -30,
  svg: -65,
  bmp: -20,
};

function getFormat(url: string): string {
  const match = url.match(/\.(\w+)(?:\?|$)/i);
  return match?.[1]?.toLowerCase() || "unknown";
}

function formatScore(url: string): number {
  const fmt = getFormat(url.toLowerCase());
  return FORMAT_SCORES[fmt] ?? -12;
}

// ── CDN URL Builder ────────────────────────────────────────────────────────────

export function buildOptimizedImageUrl(
  imageUrl: string,
  width: number,
  height: number
): string {
  if (!imageUrl) return "";

  // Already a weserv URL
  if (/images\.weserv\.nl/i.test(imageUrl)) return imageUrl;

  // Unsplash: use their CDN directly with params
  if (/images\.unsplash\.com/i.test(imageUrl)) {
    try {
      const u = new URL(imageUrl);
      u.searchParams.set("w", String(width));
      u.searchParams.set("h", String(height));
      u.searchParams.set("fit", "crop");
      u.searchParams.set("q", "82");
      u.searchParams.set("fm", "webp");
      return u.toString();
    } catch {}
  }

  // Pexels: use their CDN directly
  if (/images\.pexels\.com/i.test(imageUrl)) {
    try {
      const u = new URL(imageUrl);
      u.searchParams.set("w", String(width));
      u.searchParams.set("h", String(height));
      u.searchParams.set("fit", "crop");
      return u.toString();
    } catch {}
  }

  // Default: weserv proxy
  return `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=${width}&h=${height}&fit=cover&crop=entropy&output=webp&q=82`;
}

// ── Aspect Ratio Helpers ───────────────────────────────────────────────────────

function getRatio(width: number, height: number): number {
  return height > 0 ? width / height : 0;
}

const ROLE_ASPECT_IDEAL: Record<ImageRole, { min: number; max: number }> = {
  hero: { min: 1.5, max: 2.5 },
  showcase: { min: 1.2, max: 1.8 },
  product: { min: 0.8, max: 1.3 },
  venue: { min: 1.3, max: 1.9 },
  team: { min: 0.6, max: 1.0 },
  background: { min: 1.6, max: 2.5 },
  gallery: { min: 0.9, max: 1.6 },
  infographic: { min: 0.5, max: 1.2 },
  map: { min: 0.8, max: 1.8 },
  chart: { min: 1.0, max: 2.0 },
};

function aspectBonus(role: ImageRole, ratio: number): number {
  if (ratio <= 0) return -16;
  const ideal = ROLE_ASPECT_IDEAL[role] || { min: 0.8, max: 1.8 };
  if (ratio >= ideal.min && ratio <= ideal.max) return 32;
  if (ratio > 3.2 || ratio < 0.25) return -60;
  return 0;
}

// ── Role Detection ─────────────────────────────────────────────────────────────

export function inferImageRole(query: string, domain: string): ImageRole {
  const text = (query + " " + domain).toLowerCase();
  if (/(infographic|diagram|chart|visualization|graph|stats|statistics)/i.test(text))
    return "infographic";
  if (/(map|location|geography|city|country|region|خريطة)/i.test(text))
    return "map";
  if (/(stock|market|price|bitcoin|crypto|finance|trend)/i.test(text))
    return "chart";
  if (/(team|staff|employee|person|professional|portrait|people)/i.test(text))
    return "team";
  if (/(restaurant|interior|venue|cafe|hotel|room)/i.test(text))
    return "venue";
  if (/(product|item|goods|merchandise|package)/i.test(text))
    return "product";
  return "hero";
}

// ── Perceptual Deduplication ───────────────────────────────────────────────────

function getPathSignature(url: string): string {
  try {
    const u = new URL(url);
    // Remove CDN-specific prefixes and numeric IDs
    const path = u.pathname
      .replace(/\/\d+\//g, "/X/")
      .replace(/\d{6,}/g, "N")
      .toLowerCase();
    return `${u.hostname}${path}`;
  } catch {
    return url.slice(0, 100);
  }
}

// ── Main Scoring Function ──────────────────────────────────────────────────────

export interface ImageCandidate {
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  source?: string;
  width?: number | string;
  height?: number | string;
}

export function scoreImageCandidate(
  img: ImageCandidate,
  query: string,
  role: ImageRole,
  targetWidth: number,
  targetHeight: number
): number {
  const imageUrl = String(img?.imageUrl || img?.thumbnailUrl || "").trim();
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return -9999;

  const urlLower = imageUrl.toLowerCase();
  const title = String(img?.title || "").toLowerCase();
  const source = String(img?.source || "").toLowerCase();
  const domain = extractDomain(imageUrl).toLowerCase();

  let score = 100;

  // Block list check
  if (BLOCKED_DOMAINS.some((b) => urlLower.includes(b) || source.includes(b) || domain.includes(b))) {
    score -= 180;
  }

  // Trust boost
  if (TRUSTED_DOMAINS.some((t) => urlLower.includes(t) || source.includes(t))) {
    score += 65;
  }

  // Format scoring
  score += formatScore(urlLower);

  // Negative terms
  if (NEGATIVE_TERMS.some((term) => title.includes(term) || urlLower.includes(term))) {
    score -= 55;
  }

  // Resolution scoring
  const width = parseInt(String(img?.width || "0"), 10);
  const height = parseInt(String(img?.height || "0"), 10);
  if (width && height) {
    if (width < 640 || height < 480) score -= 80;
    if (width >= targetWidth * 0.65 && height >= targetHeight * 0.65) score += 28;
    const ratio = getRatio(width, height);
    score += aspectBonus(role, ratio);
  } else {
    score -= 16;
  }

  // Query relevance (BM25-lite)
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const matches = terms.filter((t) => title.includes(t) || source.includes(t)).length;
  score += Math.min(matches * 12, 72);

  // Role-specific domain boosts
  if (role === "product" && /(product|store|shop|catalog|منتج|متجر)/i.test(title + source)) score += 22;
  if (role === "venue" && /(interior|restaurant|cafe|hotel|venue|مطعم|فندق)/i.test(title + source)) score += 22;
  if (role === "hero" && /(wide|hero|interior|workspace|professional|modern)/i.test(title + source)) score += 16;
  if (role === "infographic" && /(infographic|diagram|chart)/i.test(title + source)) score += 30;
  if (role === "map" && /(map|satellite|aerial)/i.test(title + source)) score += 28;
  if (role === "chart" && /(chart|graph|trend|data)/i.test(title + source)) score += 25;

  return score;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Image Selection with Dedup ─────────────────────────────────────────────────

export interface ImageRolePlan {
  role: ImageRole;
  query: string;
  width: number;
  height: number;
  usage: string;
}

export function selectBestImages(
  candidates: ImageCandidate[],
  rolePlans: ImageRolePlan[],
  usedUrls: Set<string>
): ScoredImage[] {
  const selected: ScoredImage[] = [];
  const usedSignatures = new Set<string>();

  for (const plan of rolePlans) {
    const scored = candidates
      .map((img) => ({
        img,
        score: scoreImageCandidate(img, plan.query, plan.role, plan.width, plan.height),
      }))
      .filter((c) => c.score > 20)
      .sort((a, b) => b.score - a.score);

    for (const { img, score } of scored) {
      const imageUrl = String(img?.imageUrl || img?.thumbnailUrl || "");
      if (!imageUrl) continue;
      if (usedUrls.has(imageUrl)) continue;

      // Perceptual dedup
      const sig = getPathSignature(imageUrl);
      if (usedSignatures.has(sig)) continue;

      usedUrls.add(imageUrl);
      usedSignatures.add(sig);

      const width = parseInt(String(img?.width || plan.width), 10) || plan.width;
      const height = parseInt(String(img?.height || plan.height), 10) || plan.height;
      const title = String(img?.title || `${plan.role} image`).trim();

      selected.push({
        role: plan.role,
        title,
        imageUrl,
        optimizedUrl: buildOptimizedImageUrl(imageUrl, plan.width, plan.height),
        source: String(img?.source || extractDomain(imageUrl)).trim(),
        alt: title.replace(/\s+/g, " ").slice(0, 120),
        width: plan.width,
        height: plan.height,
        aspectRatio: `${plan.width}/${plan.height}`,
        score,
        query: plan.query,
        usage: plan.usage,
        format: getFormat(imageUrl),
      });
      break;
    }
  }

  return selected;
}
