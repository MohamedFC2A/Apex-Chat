export interface ApexOrganicResult {
  title: string;
  link: string;
  snippet: string;
  domain?: string;
  score?: number;
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

async function serperPost(path: "search" | "images", body: Record<string, any>, apiKey: string): Promise<any> {
  const response = await fetch(`https://google.serper.dev/${path}`, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Serper ${path} failed with status ${response.status}`);
  return response.json();
}

export async function runApexSearch(message: string, options: ApexSearchOptions = {}): Promise<ApexSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY || "0adc781c41f363a53ce1f72f199f494b9436bafd";
  const searchPlan = buildSearchPlan(message, options.intent || "website");
  const fallback: ApexSearchResponse = { organic: [], images: [], imageAssets: [], searchPlan };

  try {
    console.log(`[Apex Search] text="${searchPlan.textQuery}" imageRoles=${searchPlan.imageQueries.length}`);

    const [textData, ...imageData] = await Promise.all([
      serperPost("search", { q: searchPlan.textQuery, num: 20 }, apiKey),
      ...searchPlan.imageQueries.map((imageQuery) => serperPost("images", { q: imageQuery.query, num: 20 }, apiKey)),
    ]);

    const seenDomains: Record<string, number> = {};
    const queryTerms = searchPlan.textQuery.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
    const organic = (textData.organic || [])
      .map((item: any) => {
        const title = String(item.title || "");
        const snippet = String(item.snippet || "");
        const link = String(item.link || "");
        const domain = getDomainName(link);
        const haystack = `${title} ${snippet} ${domain}`.toLowerCase();
        const score = 100
          + queryTerms.filter((term) => haystack.includes(term)).length * 12
          + (domain.includes("wikipedia") ? 25 : 0)
          + getOrganicDomainBoost(domain, searchPlan.domain);
        return { title, snippet, link, domain, score };
      })
      .sort((a: ApexOrganicResult, b: ApexOrganicResult) => (b.score || 0) - (a.score || 0))
      .filter((item: ApexOrganicResult) => {
        if (!item.link) return false;
        const count = seenDomains[item.domain || ""] || 0;
        if (count >= 2) return false;
        seenDomains[item.domain || ""] = count + 1;
        return true;
      })
      .slice(0, 12);

    const usedImageUrls = new Set<string>();
    const imageAssets: ApexImageAsset[] = [];
    const flatImages: Array<{ title: string; imageUrl: string; source?: string }> = [];

    searchPlan.imageQueries.forEach((rolePlan, index) => {
      const candidates = (imageData[index]?.images || [])
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

      candidates.slice(0, 4).forEach((candidate: any) => {
        const imageUrl = getImageUrl(candidate.img);
        if (imageUrl) {
          flatImages.push({
            title: String(candidate.img.title || ""),
            imageUrl,
            source: String(candidate.img.source || ""),
          });
        }
      });
    });

    const primary = imageAssets[0];
    return {
      organic,
      images: flatImages.slice(0, 12),
      image: primary ? { title: primary.title, imageUrl: primary.optimizedUrl, source: primary.source } : undefined,
      imageAssets,
      searchPlan,
    };
  } catch (error) {
    console.error("[Apex Search] Search request failed:", error);
    return fallback;
  }
}

export function buildApexSearchContext(searchResults: Partial<ApexSearchResponse> | null | undefined): string {
  if (!searchResults) return "";
  let context = "";

  if (searchResults.organic?.length) {
    context += "\n=== APEX SEARCH REFERENCES ===\n";
    searchResults.organic.slice(0, 8).forEach((item, index) => {
      context += `[Reference ${index + 1}] ${item.title}\nDomain: ${item.domain || getDomainName(item.link)}\nSnippet: ${item.snippet}\nLink: ${item.link}\n\n`;
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
