import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fetchAdditionalSources, mergeWithFederation } from "./apex-search/federated-search.js";
import { getSearchCache, buildCacheKey, inferTtl } from "./apex-search/search-cache.js";
import { neuralRerank, heuristicRerank } from "./apex-search/neural-reranker.js";
import { selectBestImages, buildOptimizedImageUrl as buildCdnUrl } from "./apex-search/image-intelligence.js";
import type { ImageRolePlan } from "./apex-search/image-intelligence.js";

const execFilePromise = promisify(execFile);

// v3: Use persistent cache adapter (replaces in-memory Map)
const searchCacheAdapter = getSearchCache();

// Asynchronous Node-based URL scraper with timeout
async function scrapeUrlNode(url: string, timeoutMs = 2500): Promise<string> {
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
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
    clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
    clean = clean.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ");
    clean = clean.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");
    clean = clean.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ");
    clean = clean.replace(/<[^>]+>/g, " ");
    clean = clean.replace(/\s+/g, " ").trim();
    
    return clean;
  } catch {
    return "";
  }
}

// Semantic Snippet Extractor to rank sentences/paragraphs matching query
function extractSemanticSnippet(pageContent: string, query: string, maxLength = 1500): string {
  if (!pageContent || pageContent.length <= maxLength) return pageContent;
  
  const paragraphs = pageContent
    .split(/[.!?。！？\n]\s*/)
    .map(p => p.trim())
    .filter(p => p.length > 25 && p.length < 500);
    
  if (paragraphs.length === 0) return pageContent.slice(0, maxLength);
  
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return pageContent.slice(0, maxLength);
  
  const scoredParagraphs = paragraphs.map((p) => {
    const pLower = p.toLowerCase();
    let score = 0;
    queryTerms.forEach((term) => {
      if (pLower.includes(term)) {
        score += 10;
        if (new RegExp(`\\b${term}\\b`, 'i').test(pLower)) {
          score += 15;
        }
      }
    });
    return { text: p, score };
  });
  
  scoredParagraphs.sort((a, b) => b.score - a.score);
  
  let result = "";
  for (const item of scoredParagraphs) {
    if (item.score === 0) break;
    if (result.length + item.text.length + 3 > maxLength) {
      if (result.length === 0) {
        result = item.text.slice(0, maxLength);
      }
      break;
    }
    result += (result ? " ... " : "") + item.text;
  }
  
  return result || pageContent.slice(0, maxLength);
}


export interface ApexOrganicResult {
  title: string;
  link: string;
  snippet: string;
  domain?: string;
  score?: number;
  page_content?: string;
}

export interface ApexImageAsset {
  role: "hero" | "showcase" | "product" | "venue" | "team" | "background" | "gallery";
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
}

export interface ApexSearchResponse {
  organic: ApexOrganicResult[];
  images: Array<{ title: string; imageUrl: string; source?: string }>;
  image?: { title: string; imageUrl: string; source: string };
  imageAssets: ApexImageAsset[];
  searchPlan: {
    intent: "website" | "answer";
    domain: string;
    textQuery: string;
    imageQueries: Array<{ role: ApexImageAsset["role"]; query: string; width: number; height: number; usage: string }>;
  };
}

export interface ApexSearchOptions {
  intent?: "website" | "answer";
  isOmni?: boolean;
  expansion?: boolean;
  deep?: boolean;
  cache?: boolean;
}

const BLOCKED_IMAGE_DOMAINS = [
  "pinterest.", "pin.it", "instagram.", "facebook.", "fbcdn.", "x.com", "twitter.", "tiktok.",
  "shutterstock.", "alamy.", "gettyimages.", "istockphoto.", "dreamstime.", "depositphotos.",
  "123rf.", "vectorstock.", "freepik.", "vecteezy.", "pngtree.", "cleanpng.", "kindpng.",
  "clipart", "giphy.", "tenor.", "reddit.", "imgur.", "ytimg.", "youtube.", "wikihow.",
];

const TRUSTED_IMAGE_DOMAINS = [
  "unsplash.com", "images.unsplash.com", "pexels.com", "images.pexels.com", "wikimedia.org",
  "wikipedia.org", "cloudinary.com", "shopify.com", "squarespace-cdn.com", "wp.com",
  "wordpress.com", "cdn.shopify.com", "static.wixstatic.com",
];

const NEGATIVE_IMAGE_TERMS = [
  "logo", "icon", "vector", "clipart", "illustration", "cartoon", "watermark", "transparent",
  "isolated", "png", "template", "mockup psd", "stock vector", "ai generated",
];

function getDomainName(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function inferProjectDomain(message: string): string {
  const text = message.toLowerCase();
  const checks: Array<[string, RegExp]> = [
    ["ecommerce", /(shop|store|ecommerce|commerce|cart|checkout|product|متجر|تجارة|منتج|سلة|شراء)/i],
    ["restaurant", /(restaurant|cafe|menu|food|dish|مطعم|كافيه|قائمة|طعام|وجبات|حجز طاولة)/i],
    ["medical", /(clinic|doctor|medical|health|hospital|dental|عيادة|طبيب|طبية|صحة|مستشفى|أسنان)/i],
    ["saas", /(saas|dashboard|crm|analytics|platform|software|subscription|منصة|برنامج|لوحة|تحليلات|اشتراك)/i],
    ["education", /(course|school|academy|education|learn|training|دورة|تعليم|أكاديمية|مدرسة|تدريب)/i],
    ["portfolio", /(portfolio|agency|studio|designer|freelancer|أعمال|وكالة|مصمم|استوديو|معرض)/i],
    ["travel", /(hotel|travel|tourism|resort|booking|flight|سفر|فندق|سياحة|منتجع|رحلات)/i],
    ["real-estate", /(real estate|property|apartment|villa|broker|عقار|عقارات|شقة|فيلا|وسيط)/i],
    ["fitness", /(gym|fitness|workout|trainer|yoga|جيم|لياقة|تمارين|مدرب|يوغا)/i],
    ["beauty", /(beauty|salon|spa|cosmetic|skincare|صالون|تجميل|سبا|عناية|بشرة)/i],
  ];
  return checks.find(([, regex]) => regex.test(text))?.[0] || "business";
}

function cleanQueryText(message: string): string {
  return message
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b(create|build|make|design|generate)\s+(?:a\s+)?(?:website|site|landing\s+page|web\s+app)\b/gi, " ")
    .replace(/\b(?:website|site|landing\s+page|web\s+app)\b/gi, " ")
    .replace(/(?:اعمل|أنشئ|انشئ|اصنع|صمم|ابني|بناء|سوي|سوّي)\s+(?:لي\s+)?(?:موقع|ويب|صفحة|صفحة هبوط|تطبيق)?/gi, " ")
    .replace(/\b(?:موقع|صفحة هبوط)\b/gi, " ")
    .replace(/[^A-Za-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function inferAnswerDomain(message: string): string {
  const text = message.toLowerCase();
  const checks: Array<[string, RegExp]> = [
    ["sports", /(كورة|كرة|مباراة|دوري|كأس|لاعب|رياضة|الأهلي|الزمالك|ريال مدريد|برشلونة|football|soccer|match|score|league|cup|goal|player|club|nba|nfl|mlb)/i],
    ["technology", /(ai|model|api|code|react|typescript|python|javascript|software|github|openai|deepseek|برمجة|ذكاء|تقنية|كود|موقع)/i],
    ["finance", /(stock|market|price|crypto|bitcoin|ethereum|finance|economy|سهم|بورصة|سعر|اقتصاد|عملة|بيتكوين)/i],
    ["health", /(health|medical|doctor|medicine|disease|clinical|صحة|طبي|دواء|مرض|طبيب)/i],
    ["science", /(science|space|nasa|research|paper|study|علم|فضاء|بحث|دراسة)/i],
    ["news", /(خبر|أخبار|حدث|سياسة|رئيس|وزير|انتخابات|عاجل|news|politics|president|minister|election)/i],
  ];
  return checks.find(([, regex]) => regex.test(text))?.[0] || "general";
}

function buildSearchPlan(message: string, intent: "website" | "answer" = "website"): ApexSearchResponse["searchPlan"] {
  if (intent === "answer") {
    const domain = inferAnswerDomain(message);
    const subject = cleanQueryText(message) || domain;
    const answerSuffix: Record<string, string> = {
      sports: "latest result report",
      news: "latest reliable news",
      technology: "official documentation news",
      finance: "latest market data news",
      health: "trusted medical source",
      science: "research official source",
      general: "reliable source",
    };
    const imageSuffix: Record<string, string> = {
      sports: "sports news photo",
      news: "news photo",
      technology: "technology product photo",
      finance: "business finance photo",
      health: "healthcare professional photo",
      science: "science research photo",
      general: "high quality photo",
    };

    return {
      intent,
      domain,
      textQuery: `${subject} ${answerSuffix[domain] || answerSuffix.general}`,
      imageQueries: [
        {
          role: "hero",
          query: `${subject} ${imageSuffix[domain] || imageSuffix.general}`,
          width: 1200,
          height: 675,
          usage: "Primary image for the search answer preview",
        },
      ],
    };
  }

  const domain = inferProjectDomain(message);
  const base = cleanQueryText(message);
  const subject = base || domain;

  const domainHints: Record<string, string> = {
    ecommerce: "premium product ecommerce photography",
    restaurant: "restaurant interior food photography",
    medical: "modern clinic healthcare professional photography",
    saas: "modern software dashboard office photography",
    education: "online academy learning classroom photography",
    portfolio: "creative agency studio portfolio photography",
    travel: "luxury travel hotel destination photography",
    "real-estate": "modern real estate property interior photography",
    fitness: "modern fitness gym training photography",
    beauty: "beauty salon spa skincare photography",
    business: "modern business service professional photography",
  };

  const hint = domainHints[domain] || domainHints.business;
  const textQuery = `${subject} official examples best practices`;
  const roles: Array<{ role: ApexImageAsset["role"]; width: number; height: number; usage: string; suffix: string }> = [
    { role: "hero", width: 1400, height: 900, usage: "Hero image or first viewport visual", suffix: `${hint} hero wide` },
    { role: domain === "restaurant" ? "venue" : domain === "ecommerce" ? "product" : "showcase", width: 1000, height: 720, usage: "Primary showcase cards and featured section", suffix: `${hint} detail showcase` },
    { role: "gallery", width: 900, height: 700, usage: "Gallery, cards, testimonials, or secondary media", suffix: `${hint} clean editorial` },
  ];

  if (["medical", "portfolio", "education", "saas", "fitness", "beauty"].includes(domain)) {
    roles.push({ role: "team", width: 720, height: 860, usage: "Team/profile card image", suffix: `${hint} professional team portrait` });
  }

  return {
    intent,
    domain,
    textQuery,
    imageQueries: roles.map((role) => ({
      role: role.role,
      query: `${subject} ${role.suffix}`,
      width: role.width,
      height: role.height,
      usage: role.usage,
    })),
  };
}

function getOrganicDomainBoost(domain: string, category: string): number {
  const boosts: Record<string, string[]> = {
    sports: ["kooora.com", "yallakora.com", "filgoal.com", "btolat.com", "beinsports.com", "goal.com", "skysports.com", "espn.com", "sofascore.com", "livescore.com"],
    news: ["reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "cnn.com", "aljazeera.net", "alarabiya.net", "bloomberg.com", "theguardian.com", "nytimes.com"],
    technology: ["github.com", "stackoverflow.com", "developer.mozilla.org", "react.dev", "typescriptlang.org", "nodejs.org", "openai.com", "deepseek.com", "theverge.com", "techcrunch.com"],
    finance: ["bloomberg.com", "cnbc.com", "finance.yahoo.com", "marketwatch.com", "investopedia.com", "ft.com", "wsj.com", "forbes.com"],
    health: ["who.int", "mayoclinic.org", "nih.gov", "cdc.gov", "pubmed.ncbi.nlm.nih.gov", "webmd.com", "healthline.com"],
    science: ["nature.com", "science.org", "nasa.gov", "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "researchgate.net"],
    general: ["wikipedia.org", "britannica.com", "gov", "edu"],
  };
  const list = boosts[category] || boosts.general;
  return list.some((trusted) => domain.includes(trusted)) ? 55 : 0;
}

function getImageUrl(img: any): string {
  return String(img?.imageUrl || img?.thumbnailUrl || "").trim();
}

function scoreImageCandidate(img: any, query: string, role: ApexImageAsset["role"], targetWidth: number, targetHeight: number): number {
  const imageUrl = getImageUrl(img);
  if (!/^https?:\/\//i.test(imageUrl)) return -9999;

  const url = imageUrl.toLowerCase();
  const title = String(img?.title || "").toLowerCase();
  const source = String(img?.source || "").toLowerCase();
  const domain = getDomainName(imageUrl).toLowerCase();
  let score = 100;

  if (BLOCKED_IMAGE_DOMAINS.some((blocked) => url.includes(blocked) || source.includes(blocked) || domain.includes(blocked))) score -= 180;
  if (TRUSTED_IMAGE_DOMAINS.some((trusted) => url.includes(trusted) || source.includes(trusted) || domain.includes(trusted))) score += 60;

  if (/\.(jpg|jpeg)(\?|$)/i.test(url)) score += 28;
  else if (/\.webp(\?|$)/i.test(url)) score += 24;
  else if (/\.png(\?|$)/i.test(url)) score += 10;
  else if (/\.svg(\?|$)/i.test(url)) score -= 65;
  else score -= 12;

  if (NEGATIVE_IMAGE_TERMS.some((term) => title.includes(term) || url.includes(term))) score -= 55;

  const width = Number.parseInt(String(img?.width || "0"), 10);
  const height = Number.parseInt(String(img?.height || "0"), 10);
  if (width && height) {
    const ratio = width / height;
    const targetRatio = targetWidth / targetHeight;
    if (width < 480 || height < 320) score -= 80;
    if (width >= targetWidth * 0.65 && height >= targetHeight * 0.65) score += 28;
    if (Math.abs(ratio - targetRatio) < 0.45) score += 34;
    if (role === "hero" && ratio >= 1.25 && ratio <= 2.4) score += 30;
    if (role === "team" && ratio >= 0.55 && ratio <= 1.15) score += 25;
    if (ratio > 3.2 || ratio < 0.28) score -= 65;
  } else {
    score -= 16;
  }

  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  const matches = terms.filter((term) => title.includes(term) || source.includes(term)).length;
  score += Math.min(matches * 12, 72);

  if (role === "product" && /(product|store|shop|catalog|منتج|متجر)/i.test(title + source)) score += 22;
  if (role === "venue" && /(interior|restaurant|cafe|hotel|venue|مطعم|فندق)/i.test(title + source)) score += 22;
  if (role === "hero" && /(wide|hero|interior|workspace|professional|modern)/i.test(title + source)) score += 16;

  return score;
}

function buildOptimizedImageUrl(imageUrl: string, width: number, height: number): string {
  if (/images\.weserv\.nl/i.test(imageUrl)) return imageUrl;
  return `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=${width}&h=${height}&fit=cover&crop=entropy&output=webp&q=82`;
}

function toImageAsset(img: any, rolePlan: ApexSearchResponse["searchPlan"]["imageQueries"][number], score: number): ApexImageAsset {
  const imageUrl = getImageUrl(img);
  const width = Number.parseInt(String(img?.width || rolePlan.width), 10) || rolePlan.width;
  const height = Number.parseInt(String(img?.height || rolePlan.height), 10) || rolePlan.height;
  const title = String(img?.title || `${rolePlan.role} image`).trim();
  return {
    role: rolePlan.role,
    title,
    imageUrl,
    optimizedUrl: buildOptimizedImageUrl(imageUrl, rolePlan.width, rolePlan.height),
    source: String(img?.source || getDomainName(imageUrl) || "").trim(),
    alt: title.replace(/\s+/g, " ").slice(0, 120),
    width: rolePlan.width,
    height: rolePlan.height,
    aspectRatio: `${rolePlan.width}/${rolePlan.height}`,
    score,
    query: rolePlan.query,
    usage: rolePlan.usage,
  };
}

export async function runApexSearch(message: string, options: ApexSearchOptions = {}): Promise<ApexSearchResponse> {
  const searchPlan = buildSearchPlan(message, options.intent || "website");
  const fallback: ApexSearchResponse = { organic: [], images: [], imageAssets: [], searchPlan };

  // 1. Cache lookup (v3: smart TTL per domain)
  const skipCache = options.cache === false;
  const cacheKey = buildCacheKey(message, options.intent || "website", !!options.isOmni, options.deep);
  if (!skipCache) {
    const cached = await searchCacheAdapter.get(cacheKey);
    if (cached) {
      console.log(`[Apex Search v3] Cache HIT for key: "${cacheKey.slice(0, 60)}"`);
      return cached;
    }
  }

  try {
    console.log(`[Apex Search] Running Hybrid Search. text="${searchPlan.textQuery}" isOmni=${!!options.isOmni}`);

    // Define DDG python run promise
    const runDdgSearch = async (): Promise<{ organic: ApexOrganicResult[], images: any[] }> => {
      try {
        const args = [
          path.join(process.cwd(), "server/ddg_search.py"),
          "--query", searchPlan.textQuery,
          "--image-queries", JSON.stringify(searchPlan.imageQueries),
        ];
        if (options.isOmni || options.expansion) {
          args.push("--omni");
        }

        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const { stdout, stderr } = await execFilePromise(pythonCmd, args, { maxBuffer: 15 * 1024 * 1024 });

        if (stderr) {
          console.warn("[Apex Search] Python search stderr:", stderr);
        }

        const pyData = JSON.parse(stdout);
        const organic: ApexOrganicResult[] = (pyData.organic || []).map((item: any) => ({
          title: String(item.title || ""),
          snippet: String(item.snippet || ""),
          link: String(item.link || ""),
          domain: String(item.domain || getDomainName(item.link)),
          score: Number(item.score || 100),
          page_content: item.page_content ? String(item.page_content) : undefined,
        }));

        const images = (pyData.images || []).map((img: any) => ({
          title: String(img.title || ""),
          imageUrl: getImageUrl(img),
          source: String(img.source || ""),
          thumbnailUrl: String(img.thumbnailUrl || ""),
          width: img.width,
          height: img.height
        }));

        return { organic, images };
      } catch (err) {
        console.error("[Apex Search] DDG search failed, falling back:", err);
        return { organic: [], images: [] };
      }
    };

    // 2. Run DDG + fetch additional sources in parallel (v3: Federated Search)
    const [ddgResults, additionalSources] = await Promise.all([
      runDdgSearch(),
      fetchAdditionalSources(searchPlan.textQuery, 2000),
    ]);

    // 3. Federated merging with Reciprocal Rank Fusion (v3)
    const federatedOrganic = mergeWithFederation(
      ddgResults.organic,
      additionalSources.brave,
      additionalSources.wikipedia
    );
    const organic: ApexOrganicResult[] = federatedOrganic;

    // 4. Parallel Async Scraper for missing page content (Top 35 Results)
    const scrapeLimit = options.isOmni ? 35 : 20;
    const skipScraping = options.deep === false;
    const topResultsToScrape = skipScraping ? [] : organic.slice(0, scrapeLimit).filter((item) => !item.page_content);

    if (topResultsToScrape.length > 0) {
      console.log(`[Apex Search] Scraping content for ${topResultsToScrape.length} top search results in parallel...`);
      await Promise.all(
        topResultsToScrape.map(async (item) => {
          const content = await scrapeUrlNode(item.link);
          if (content) {
            item.page_content = content;
          }
        })
      );
    }

    // 5. Semantic Vector Paragraph Ranking
    organic.forEach((item) => {
      if (item.page_content) {
        item.page_content = extractSemanticSnippet(item.page_content, searchPlan.textQuery);
      }
    });

    // 5b. Neural Reranking (v3: LLM cross-encoder for deep/omni queries)
    if ((options.deep !== false && options.isOmni) || options.deep === true) {
      const reranked = await neuralRerank(searchPlan.textQuery, organic as any, 15);
      organic.length = 0;
      organic.push(...(reranked as ApexOrganicResult[]));
      console.log(`[Apex Search v3] Neural reranking complete. Top: "${organic[0]?.title?.slice(0, 50)}"`);
    }

    // 6. Merge Images and rank assets
    const mergedImages = ddgResults.images;
    const usedImageUrls = new Set<string>();
    const imageAssets: ApexImageAsset[] = [];
    const flatImages: Array<{ title: string; imageUrl: string; source?: string }> = [];

    searchPlan.imageQueries.forEach((rolePlan) => {
      const candidates = mergedImages
        .map((img: any) => ({
          img,
          score: scoreImageCandidate(img, rolePlan.query, rolePlan.role, rolePlan.width, rolePlan.height),
        }))
        .filter((candidate: any) => candidate.score > 20 && getImageUrl(candidate.img))
        .sort((a: any, b: any) => b.score - a.score);

      for (const candidate of candidates) {
        const imageUrl = getImageUrl(candidate.img);
        if (usedImageUrls.has(imageUrl)) continue;
        usedImageUrls.add(imageUrl);
        imageAssets.push(toImageAsset(candidate.img, rolePlan, candidate.score));
        break;
      }
    });

    mergedImages.slice(0, 20).forEach((img: any) => {
      const imageUrl = getImageUrl(img);
      if (imageUrl && !usedImageUrls.has(imageUrl)) {
        usedImageUrls.add(imageUrl);
        flatImages.push({
          title: String(img.title || ""),
          imageUrl,
          source: String(img.source || ""),
        });
      }
    });

    // 7. Vision-Language Reranking Step
    const imagePayloads = extractBase64Images(message);
    const candidateTextChunks = organic.map((o: ApexOrganicResult) => `${o.title}\n${o.snippet}`);
    if (candidateTextChunks.length > 0) {
      console.log(`[Apex Search] Intercepting ${candidateTextChunks.length} chunks for Vision Reranking...`);
      const rerankedTextChunks = await runVisionReranking(message, imagePayloads, candidateTextChunks);
      const rerankedOrganic: typeof organic = [];
      for (const chunk of rerankedTextChunks) {
        const found = organic.find((o: ApexOrganicResult) => `${o.title}\n${o.snippet}` === chunk);
        if (found) rerankedOrganic.push(found);
      }
      for (const item of organic) {
        if (!rerankedOrganic.includes(item)) rerankedOrganic.push(item);
      }
      organic.length = 0;
      organic.push(...rerankedOrganic);
    }

    const primary = imageAssets[0];
    const finalResponse: ApexSearchResponse = {
      organic,
      images: flatImages.slice(0, 12),
      image: primary ? { title: primary.title, imageUrl: primary.optimizedUrl, source: primary.source } : undefined,
      imageAssets,
      searchPlan,
    };

    // Cache the result (v3: smart TTL based on query domain)
    const { ttlMs, label } = inferTtl(message);
    await searchCacheAdapter.set(cacheKey, finalResponse, ttlMs);
    console.log(`[Apex Search v3] Cached result (TTL=${Math.round(ttlMs/60000)}min, domain=${label})`);

    return finalResponse;
  } catch (error) {
    console.error("[Apex Search] Hybrid search execution failed:", error);
    return fallback;
  }
}

export function buildApexSearchContext(searchResults: Partial<ApexSearchResponse> | null | undefined): string {
  if (!searchResults) return "";
  let context = "";

  if (searchResults.organic?.length) {
    context += "\n=== APEX SEARCH REFERENCES ===\n";
    // Up to 35 sources to provide extensive information (Superpowered)
    searchResults.organic.slice(0, 35).forEach((item, index) => {
      context += `[Reference ${index + 1}] ${item.title}\nDomain: ${item.domain || getDomainName(item.link)}\nSnippet: ${item.snippet}\nLink: ${item.link}\n`;
      if (item.page_content) {
        context += `Scraped Content:\n${item.page_content}\n`;
      }
      context += `\n`;
    });
  }

  if (searchResults.imageAssets?.length) {
    context += "\n=== APEX CURATED IMAGE ASSETS ===\n";
    context += "Use these exact optimizedUrl values for raster <img> elements. Match each role to the correct section. Do not use random placeholders when a matching asset exists.\n";
    searchResults.imageAssets.forEach((asset, index) => {
      context += `[Image Asset ${index + 1}]\nRole: ${asset.role}\nUsage: ${asset.usage}\nAlt: ${asset.alt}\nOptimized URL: ${asset.optimizedUrl}\nOriginal URL: ${asset.imageUrl}\nAspect Ratio: ${asset.aspectRatio}\nSource: ${asset.source}\n\n`;
    });
  } else if (searchResults.images?.length) {
    context += "\n=== APEX RAW IMAGE CANDIDATES ===\n";
    searchResults.images.slice(0, 6).forEach((img, index) => {
      context += `[Image ${index + 1}] Title: ${img.title}\nURL: ${img.imageUrl}\nSource: ${img.source || ""}\n\n`;
    });
  }

  return context;
}

export function extractBase64Images(message: string): string[] {
  const images: string[] = [];
  const regex = /data:image\/[a-zA-Z+.-]+;base64,[a-zA-Z0-9+/=]+/g;
  let match;
  while ((match = regex.exec(message)) !== null) {
    images.push(match[0]);
  }
  
  const evidenceStartIdx = message.indexOf("=== ATTACHMENT_EVIDENCE_START ===");
  const evidenceEndIdx = message.indexOf("=== ATTACHMENT_EVIDENCE_END ===");
  if (evidenceStartIdx !== -1 && evidenceEndIdx !== -1) {
    const evidenceBlock = message.substring(evidenceStartIdx, evidenceEndIdx);
    const base64Regex = /(?:[A-Za-z0-9+/]{4}){15,}/g;
    let b64Match;
    while ((b64Match = base64Regex.exec(evidenceBlock)) !== null) {
      images.push(`data:image/png;base64,${b64Match[0]}`);
    }
  }
  return images;
}

export async function runVisionReranking(
  query: string,
  imagePayloads: string[],
  textChunks: string[]
): Promise<string[]> {
  if (!textChunks || textChunks.length === 0) {
    return [];
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("[Vision Reranking] OPENROUTER_API_KEY is not set. Skipping reranking.");
    return textChunks;
  }

  try {
    const documents = textChunks.map((chunk, index) => {
      if (imagePayloads && imagePayloads.length > 0) {
        const image = imagePayloads[index % imagePayloads.length];
        return {
          text: chunk,
          image: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
        };
      }
      return chunk;
    });

    const payload = {
      model: "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
      query: query,
      documents: documents
    };

    const response = await fetch("https://openrouter.ai/api/v1/rerank", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Rerank API returned status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    if (result && result.results && Array.isArray(result.results)) {
      const sortedResults = result.results.sort((a: any, b: any) => b.relevance_score - a.relevance_score);
      const sortedChunks = sortedResults.map((r: any) => textChunks[r.index]);
      console.log(`[Vision Reranking] Reranked ${textChunks.length} documents. Top score: ${sortedResults[0]?.relevance_score}`);
      return sortedChunks;
    }
  } catch (error) {
    console.error("[Vision Reranking] Failed to run reranking:", error);
  }

  return textChunks;
}
