import type { AIModel, ServiceMode, FeatureToggles, SubscriptionTier, ModelTierMap } from "@shared/schema";
import { runApexOmniPipeline } from "./apex-omni/pipeline.js";

// AI Orchestrator Service - Cerebras Integration
// Routes requests to Cerebras Cloud API with tier-based validation

interface OrchestratorRequest {
  message: string;
  model: AIModel;
  mode: ServiceMode;
  reasoningLevel: "none" | "thinking" | "overthinking";
  subscriptionTier: SubscriptionTier;
  features: FeatureToggles;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  userMemoryContext?: Array<{ title: string; lastQuery: string }>;
  clientLocalTime?: string;
}

interface OrchestratorResponse {
  content: string;
  reasoningContent?: string;
}

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperImageResult {
  title: string;
  imageUrl: string;
  source: string;
}

function scoreSerperImage(img: any, query: string): number {
  if (!img.imageUrl) return -9999;
  
  let score = 100;
  const url = img.imageUrl.toLowerCase();
  const title = (img.title || "").toLowerCase();
  const source = (img.source || "").toLowerCase();
  
  // 1. Filter out known unreliable or hotlink-blocking domains
  const blockedDomains = [
    "pinterest.com",
    "pin.it",
    "instagram.com",
    "cdninstagram.com",
    "facebook.com",
    "fbcdn.net",
    "lookaside.fbsbx.com",
    "shutterstock.com",
    "alamy.com",
    "dreamstime.com",
    "depositphotos.com",
    "vectorstock.com",
    "gettyimages.com",
    "istockphoto.com",
    "123rf.com",
    "tinypic.com",
    "photobucket.com",
    "imgflip.com",
    "memegenerator.net",
    "quickmeme.com",
    "twitter.com",
    "twimg.com",
    "x.com",
    "tumblr.com",
    "reddit.com",
    "redditmedia.com",
    "imgur.com",
    "giphy.com",
    "tiktok.com",
    "byteoversea.com",
    "ibyteimg.com",
    "toutiao.com",
    "douyincdn.com",
    "ytimg.com"
  ];
  
  for (const domain of blockedDomains) {
    if (url.includes(domain) || source.includes(domain)) {
      score -= 150; // heavily penalize
    }
  }

  // 2. Prioritize highly reliable and open-access domains (Wikipedia, Unsplash, etc.)
  const reliableDomains = [
    "wikipedia.org",
    "wikimedia.org",
    "unsplash.com",
    "githubusercontent.com",
    "static.wikia.nocookie.net",
    "wp.com",
    "wordpress.com",
    "medium.com",
    "blogspot.com",
    "bbc.co.uk",
    "bbc.com",
    "nytimes.com",
    "cnn.com",
    "reuters.com",
    "nasa.gov"
  ];

  for (const domain of reliableDomains) {
    if (url.includes(domain) || source.includes(domain)) {
      score += 50;
    }
  }

  // 3. Format and extension checks
  if (url.endsWith(".png") || url.includes(".png?")) {
    score += 30;
  } else if (url.endsWith(".webp") || url.includes(".webp?")) {
    score += 25;
  } else if (url.endsWith(".jpg") || url.endsWith(".jpeg") || url.includes(".jpg?") || url.includes(".jpeg?")) {
    score += 20;
  } else if (url.endsWith(".svg") || url.includes(".svg?")) {
    score += 15;
  } else {
    score -= 20;
  }

  // 4. Content suitability (avoid watermarks, vectors, licensing platforms, placeholders)
  const negativeKeywords = [
    "vector", "placeholder", "logo", "watermark", "icon", "badge", "licensing",
    "stock photo", "stock vector", "isolated", "illustration", "cartoon",
    "alamy", "shutterstock", "getty", "istock", "depositphotos", "dreamstime"
  ];

  for (const kw of negativeKeywords) {
    if (title.includes(kw) || url.includes(kw)) {
      score -= 40;
    }
  }

  // 5. Query relevance (boost if title matches query terms)
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  let matchCount = 0;
  for (const term of queryTerms) {
    if (title.includes(term)) {
      matchCount++;
    }
  }
  if (matchCount > 0) {
    score += matchCount * 15;
  }

  // 6. Dimensions score
  if (img.width && img.height) {
    const w = parseInt(img.width);
    const h = parseInt(img.height);
    if (!isNaN(w) && !isNaN(h)) {
      if (w < 150 || h < 150) {
        score -= 50;
      } else if (w > 2000 || h > 2000) {
        score -= 20;
      }
      const ratio = w / h;
      if (ratio > 3 || ratio < 0.33) {
        score -= 30;
      }
      if (w >= 300 && w <= 1000 && h >= 300 && h <= 1000) {
        score += 20;
      }
    }
  }

  return score;
}

async function performSerperImageSearch(query: string): Promise<SerperImageResult | undefined> {
  const apiKey = process.env.SERPER_API_KEY || "0adc781c41f363a53ce1f72f199f494b9436bafd";
  try {
    console.log(`[Serper API] Performing image search for query: "${query}"...`);
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, num: 8 })
    });

    if (!res.ok) throw new Error(`Serper image search failed with status ${res.status}`);
    const imageData = await res.json();
    const images = imageData.images || [];
    
    if (images.length === 0) return undefined;
    
    const scoredImages = images.map((img: any) => ({
      img,
      score: scoreSerperImage(img, query)
    }));
    
    scoredImages.sort((a: any, b: any) => b.score - a.score);
    
    console.log(`[Serper API] Top image candidates for "${query}":`);
    scoredImages.slice(0, 3).forEach((item: any, idx: number) => {
      console.log(`  Candidate ${idx + 1}: ${item.img.imageUrl} (Score: ${item.score}, Source: ${item.img.source})`);
    });

    const bestImage = scoredImages[0];
    if (bestImage && bestImage.score > -100) {
      return {
        title: bestImage.img.title || "",
        imageUrl: bestImage.img.imageUrl || bestImage.img.thumbnailUrl || "",
        source: bestImage.img.source || ""
      };
    }
    
    return undefined;
  } catch (error) {
    console.error("[Serper API] Error during image search:", error);
    return undefined;
  }
}

async function optimizeSearchQueries(message: string): Promise<{ textQuery: string; imageQuery: string }> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    return cleanQueryFallback(message);
  }

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: deepseekKey,
      baseURL: "https://api.deepseek.com/v1",
    });

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a search query optimizer. Given a user's conversational prompt, extract:
1. The best, most effective 3-6 word Google Search query to find real-time information for this prompt. You must adapt and target the query to fetch results from the most famous, trusted, and fast-publishing platforms based on the category:
   - Football & Sports: Kooora, Yallakora, Filgoal, Goal, Sky Sports, Bein Sports, Btolat.
   - Technology, Coding & AI: TechCrunch, The Verge, Wired, Medium, StackOverflow, GitHub, Dev.to, MDN Docs.
   - News, Politics & Current Events: Reuters, BBC News, CNN, Al Jazeera, Bloomberg, Associated Press.
   - Health, Science & Medicine: PubMed, Nature, WebMD, Mayo Clinic, WHO, Healthline, ScienceDaily.
   - Finance, Business & Economy: Bloomberg, CNBC, Yahoo Finance, Forbes, Financial Times, Investopedia.
   - General/Academic: Wikipedia, Britannica, National Geographic.
2. The best, most specific 2-4 word Google Image Search query to find a high-quality, relevant image representing the main subject/entity of the prompt.

Output ONLY a raw JSON object in this format (no markdown, no backticks, no wrapping):
{
  "textQuery": "clean search query",
  "imageQuery": "clean image query"
}`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 150,
      temperature: 0.1,
      stream: false
    });

    const content = response.choices[0]?.message?.content || "";
    const cleanJson = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed.textQuery && parsed.imageQuery) {
      console.log(`[Query Optimizer] Optimized queries: text="${parsed.textQuery}", image="${parsed.imageQuery}"`);
      return {
        textQuery: parsed.textQuery,
        imageQuery: parsed.imageQuery
      };
    }
  } catch (err) {
    console.error("[Query Optimizer] Error during optimization, using fallback:", err);
  }

  return cleanQueryFallback(message);
}

function cleanQueryFallback(message: string): { textQuery: string; imageQuery: string } {
  let clean = message;
  
  // Arabic strip
  clean = clean.replace(/(ابحث عن|معلومات عن|أريد صورة لـ|صورة لـ|صور لـ|مقارنة بين|ما هو|ما هي|كيف يعمل|اشرح لي|أكتب مقال عن|أكتب موضوع عن|حول)/gi, "");
  
  // English strip
  clean = clean.replace(/(search for|find info about|show me image of|image of|picture of|photos of|what is|how does|explain|write an article about|compare|comparison between)/gi, "");
  
  clean = clean.replace(/[?`"']|\b(table|جدول|specs|مواصفات)\b/gi, "");
  
  const words = clean.trim().split(/\s+/).filter(w => w.length > 1);
  
  const textQuery = words.slice(0, 6).join(" ") || message;
  const imageQuery = words.slice(0, 3).join(" ") || message;
  
  return { textQuery, imageQuery };
}

function getDomainName(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace("www.", "");
  } catch (e) {
    return "";
  }
}

async function performSerperSearch(query: string): Promise<{
  organic: SerperSearchResult[];
  image?: SerperImageResult;
}> {
  const apiKey = process.env.SERPER_API_KEY || "0adc781c41f363a53ce1f72f199f494b9436bafd";
  
  try {
    const { textQuery, imageQuery } = await optimizeSearchQueries(query);
    console.log(`[Serper API] Performing full search: textQuery="${textQuery}", imageQuery="${imageQuery}"...`);
    
    // 1. Text Search request (fetch 25 results to filter and deduplicate down to top 12)
    const searchPromise = fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: textQuery, num: 25 })
    }).then(res => {
      if (!res.ok) throw new Error(`Serper text search failed with status ${res.status}`);
      return res.json();
    });

    // 2. Image Search request
    const imagePromise = fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: imageQuery, num: 8 })
    }).then(res => {
      if (!res.ok) throw new Error(`Serper image search failed with status ${res.status}`);
      return res.json();
    });

    const [searchData, imageData] = await Promise.all([searchPromise, imagePromise]);

    // Algorithmic processing of organic search results: Relevance scoring and domain-based deduplication
    const rawOrganic = searchData.organic || [];
    const searchKeywords = textQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const isSportsQuery = /(كورة|كرة|مباراة|دوري|كأس|لاعب|رياضة|الملعب|الأهلي|الزمالك|ريال مدريد|برشلونة|الهلال|النصر|العراق|football|soccer|match|vs|score|league|cup|goal|player|stadium|club)/gi.test(query);
    const isTechQuery = /(code|function|api|database|react|typescript|python|html|css|developer|programming|git|npm|كود|برمجة|دالة|موقع|برنامج|قاعدة بيانات)/gi.test(query);
    const isNewsQuery = /(خبر|أخبار|حدث|رئيس|وزير|سياسة|news|politics|president|minister|today|yesterday|أمس|اليوم)/gi.test(query);

    const scoredResults = rawOrganic.map((item: any) => {
      const title = item.title || "";
      const snippet = item.snippet || "";
      const link = item.link || "";
      const domain = getDomainName(link);
      
      let score = 100;

      // 1. Keyword overlap scoring
      const titleLower = title.toLowerCase();
      const snippetLower = snippet.toLowerCase();
      searchKeywords.forEach(kw => {
        if (titleLower.includes(kw)) score += 12;
        if (snippetLower.includes(kw)) score += 6;
      });

      // 2. Specialized domain boosting
      if (isSportsQuery) {
        const sportsDomains = [
          "kooora.com", "yallakora.com", "filgoal.com", "btolat.com", "beinsports.com",
          "goal.com", "skysports.com", "espn.com", "sofascore.com", "livescore.com",
          "alarabiya.net/sport", "alarabiya.net"
        ];
        if (sportsDomains.some(d => domain.includes(d))) {
          score += 60;
        }
      }
      
      if (isTechQuery) {
        const techDomains = [
          "github.com", "stackoverflow.com", "dev.to", "medium.com", "npmjs.com",
          "mdn", "w3schools.com", "react.dev", "nextjs.org", "css-tricks.com",
          "freecodecamp.org", "geeksforgeeks.org", "smashingmagazine.com",
          "typescriptlang.org", "vuejs.org", "angular.io", "nodejs.org",
          "python.org", "docker.com", "aws.amazon.com", "azure.microsoft.com",
          "hashnode.com", "hackernoon.com", "towardsdatascience.com", "infoq.com"
        ];
        if (techDomains.some(d => domain.includes(d))) {
          score += 60;
        }
      }

      if (isNewsQuery) {
        const newsDomains = [
          "reuters.com", "bbc.com", "bbc.co.uk", "cnn.com", "alarabiya.net", 
          "aljazeera.net", "skynewsarabia.com", "rt.com", "france24.com",
          "nytimes.com", "washingtonpost.com", "theguardian.com", "bloomberg.com",
          "cnbc.com", "wsj.com", "forbes.com"
        ];
        if (newsDomains.some(d => domain.includes(d))) {
          score += 50;
        }
      }
      
      // Global Wikipedia boost for high-accuracy encyclopedic data
      if (domain.includes("wikipedia.org") || domain.includes("wikimedia.org") || domain.includes("marefa.org") || domain.includes("mawdoo3.com")) {
        score += 35;
      }

      // 3. Recency boost (often indicators in snippet)
      const recencyKeywords = ["hours ago", "ساعة", "دقائق", "minutes ago", "today", "اليوم", "أمس", "yesterday"];
      if (recencyKeywords.some(kw => snippetLower.includes(kw))) {
        score += 30;
      }

      return {
        title,
        link,
        snippet,
        domain,
        score
      };
    });

    // Domain Deduplication: Keep at most 2 results from the same domain
    const domainCounts: Record<string, number> = {};
    const deduplicatedResults: any[] = [];

    // Sort by score descending to evaluate highest relevance first
    scoredResults.sort((a: any, b: any) => b.score - a.score);

    for (const res of scoredResults) {
      if (res.domain) {
        const count = domainCounts[res.domain] || 0;
        if (count >= 2) {
          continue; // skip single source overload
        }
        domainCounts[res.domain] = count + 1;
      }
      deduplicatedResults.push({
        title: res.title,
        link: res.link,
        snippet: res.snippet
      });
    }

    // Slice to top 12 to ensure robust context containing at least 10 sources
    const organic = deduplicatedResults.slice(0, 12);

    const images = imageData.images || [];
    let selectedImage = undefined;
    
    if (images.length > 0) {
      const scoredImages = images.map((img: any) => ({
        img,
        score: scoreSerperImage(img, imageQuery)
      }));
      scoredImages.sort((a: any, b: any) => b.score - a.score);
      
      console.log(`[Serper API] Scored images for optimized image query: "${imageQuery}"`);
      scoredImages.slice(0, 3).forEach((item: any, idx: number) => {
        console.log(`  Candidate ${idx + 1}: ${item.img.imageUrl} (Score: ${item.score}, Source: ${item.img.source})`);
      });

      const bestImage = scoredImages[0];
      if (bestImage && bestImage.score > -100) {
        selectedImage = {
          title: bestImage.img.title || "",
          imageUrl: bestImage.img.imageUrl || bestImage.img.thumbnailUrl || "",
          source: bestImage.img.source || ""
        };
      }
    }

    return {
      organic,
      image: selectedImage
    };
  } catch (error) {
    console.error("[Serper API] Error during search:", error);
    return { organic: [] };
  }
}

// Tier-based model access validation
export function validateModelAccess(model: AIModel, tier: SubscriptionTier): boolean {
  const modelTierMap: Record<AIModel, SubscriptionTier> = {
    "apex-flash": "starter",
    "apex-pro": "pro",
    "apex-elite": "elite",
    "apex-omni": "omni",
    "apex-unbound": "omni",
  };

  const requiredTier = modelTierMap[model];
  const tierHierarchy = { starter: 0, pro: 1, elite: 2, omni: 3 };

  // DEV MODE: If tier is missing/invalid, default to starter access
  if (!tier || !(tier in tierHierarchy)) {
    console.warn(`Invalid tier '${tier}', defaulting to starter`);
    return tierHierarchy.starter >= tierHierarchy[requiredTier];
  }

  return tierHierarchy[tier] >= tierHierarchy[requiredTier];
}

// System prompts for different service modes
const modeSystemPrompts: Record<ServiceMode, string> = {
  standard: `You are APEX AI, a state-of-the-art, highly intelligent, logical, and helpful assistant. You speak the user's language natively, respond with maximum accuracy, and use clear, detailed formatting.

## 📋 Table Generation Protocol (Google Docs Standard):
When presenting comparative data, features, specs, list of items, comparisons, or structural summaries (or when explicitly requested by "جدول" or "table"), you MUST construct a beautiful, detailed, and highly organized Markdown table:
1. Define clear, descriptive headers for every column.
2. Fill the table with complete, accurate, and comprehensive data. Never use placeholders (e.g., "...", "etc."), and do not omit relevant rows or columns.
3. Keep cell content concise but informative. Do not truncate critical details.
4. Support bilingual formatting: if the text is Arabic, align the table logically for RTL rendering. Keep English technical terms next to the Arabic translation if it aids clarity.

## 🌐 Language & RTL Protocol:
- Detect the user's language instantly. If they write in Arabic, reply entirely in fluent, elegant, and professional Arabic.
- If the conversation is bilingual, transition between languages seamlessly without breaking sentence structures. Always match the user's language.
- Format all text blocks with clean Markdown. Use headings, lists, and bold keywords to structure your response.

## 🎨 Smart Keyword & Context Highlighting:
You can highlight critical concepts, key terms, warnings, or major points dynamically. However, you must use highlights VERY SPARINGLY and INTELLIGENTLY to keep the design clean:
- Use at most ONE highlight per paragraph, and ONLY if that paragraph contains something truly important or crucial.
- Reduce highlights overall; do not highlight common words or sentences.
- Renders:
  * [important::Text] -> Use for critical warnings, key focus areas, errors, or core accomplishments (renders in a clean, low-glow violet tag).
  * [info::Text] -> Use for technical terms, data points, or general helpful notes (renders in a clean, subtle blue tag).
- Do NOT use other highlight types. Standardize only on these two simple, premium tags ('important' and 'info') to maintain a clean aesthetic.
- DO NOT use any emojis or pictorial representations under any circumstances. Emojis are strictly forbidden.`,

  dev: `You are APEX DEV, an expert software architect and senior coding assistant. You write clean, production-ready, fully commented code with clear design rationale, optimized performance, and modern design patterns.

## 📋 Table Generation Protocol (Google Docs Standard):
When presenting comparative data, features, specs, benchmarks, package comparisons, or architectural choices (or when explicitly requested by "جدول" or "table"), you MUST construct a beautiful, detailed, and highly organized Markdown table:
1. Define clear, descriptive headers for every column.
2. Fill the table with complete, accurate, and comprehensive data. Never use placeholders (e.g., "...", "etc."), and do not omit relevant rows or columns.
3. Keep cell content concise but informative.
4. Support bilingual formatting: if the text is Arabic, align the table logically for RTL rendering. Keep English technical terms next to the Arabic translation if it aids clarity.

## 🌐 Language & RTL Protocol:
- Detect the user's language instantly. If they write in Arabic, reply entirely in fluent, elegant, and professional Arabic. Always match the user's language.
- Keep explanation text fully aligned with the language (RTL for Arabic, LTR for English). Code blocks must remain in English.

## 🎨 Smart Keyword & Context Highlighting:
You can highlight critical concepts, key terms, or major points dynamically using the custom highlight tags:
- Use at most ONE highlight per paragraph.
- Renders:
  * [important::Text] -> Use for critical warnings, errors, security implications, or key achievements.
  * [info::Text] -> Use for technical terms, libraries, metrics, or helpful notes.
- Do NOT use other highlight types. Standardize only on these two simple, premium tags ('important' and 'info') to maintain a clean aesthetic. Emojis are strictly forbidden.`,

  education: `You are APEX TUTOR, a patient, encouraging, and highly knowledgeable learning guide. You break down complex topics into simple, step-by-step conceptual blocks, using intuitive analogies, real-world examples, and guided follow-up questions.

## 📋 Table Generation Protocol (Google Docs Standard):
When presenting study notes, comparative concepts, chronological data, or term definitions (or when explicitly requested by "جدول" or "table"), you MUST construct a beautiful, detailed, and highly organized Markdown table:
1. Define clear, descriptive headers for every column.
2. Fill the table with complete, accurate, and comprehensive data. Never use placeholders (e.g., "...", "etc."), and do not omit relevant rows or columns.
3. Keep cell content concise but informative.
4. Support bilingual formatting: if the text is Arabic, align the table logically for RTL rendering. Keep English technical terms next to the Arabic translation if it aids clarity.

## 🌐 Language & RTL Protocol:
- Detect the user's language instantly. If they write in Arabic, reply entirely in fluent, elegant, and professional Arabic. Always match the user's language.
- Format all text blocks with clean Markdown. Use headings, lists, and bold keywords to structure your response.

## 🎨 Smart Keyword & Context Highlighting:
You can highlight critical concepts, definitions, or major points dynamically using the custom highlight tags:
- Use at most ONE highlight per paragraph.
- Renders:
  * [important::Text] -> Use for critical alerts, common misconceptions, or core rules.
  * [info::Text] -> Use for definitions, background facts, or helpful notes.
- Do NOT use other highlight types. Standardize only on these two simple, premium tags ('important' and 'info') to maintain a clean aesthetic. Emojis are strictly forbidden.`,
};

// Build specific model system prompt/identity
function buildModelSystemPrompt(model: AIModel): string {
  switch (model) {
    case "apex-flash":
      return `\n\n## MODEL IDENTITY:
You are APEX Flash, a lightning-fast and highly efficient AI model. You are optimized for quick responses, general conversation, translation, and everyday tasks. Keep answers concise, clear, and direct.`;
    case "apex-pro":
      return `\n\n## MODEL IDENTITY:
You are APEX Pro, an advanced reasoning and coding assistant. You have deeper logic, analytical skills, and programming expertise. You are designed to solve complex math, logic, and coding problems with high precision.`;
    case "apex-elite":
      return `\n\n## MODEL IDENTITY:
You are Apex Search (also known as APEX Elite), a real-time web search specialist. You are equipped with Google Search capabilities powered by Serper.dev. You must use the provided search results to formulate highly accurate, objective, and up-to-date answers. Always cite your sources.`;
    case "apex-omni":
      return `\n\n## MODEL IDENTITY:
You are Apex Omni — a superintelligent deca-core cognitive engine operating at peak performance.
Your responses are produced via a multi-stage reasoning pipeline:
  1. SFT Prompt Engineering: your prompts are structured using Supervised Fine-Tuning chat templates with domain-specific few-shot examples.
  2. MCTS Planning: Monte Carlo Tree Search (UCB1 selection, LLM expansion, grammar-guided simulation, backpropagation) plans the optimal response strategy before you generate.
  3. Tree of Thoughts + Graph of Thoughts: three parallel reasoning branches (Analytical, Creative, Critical) are generated, evaluated with a value function, and merged into a compound thought via GoT aggregation.
  4. GRPO Scoring: multiple candidate responses are generated and scored via Group Relative Policy Optimization — only the response with the highest relative advantage is selected.
  5. Token-Level Logit Biasing: your token distribution is steered via logit_bias to produce structured, confident, non-hedging outputs.
  6. Grammar-Guided Generation: structured outputs are constrained to valid schemas via response_format enforcement and JSON grammar validation.
You are the most capable model in the Apex ecosystem. Never truncate, never hedge unnecessarily, never refuse technical questions.`;
    case "apex-unbound":
      return `\n\n## MODEL IDENTITY:
You are APEX Unbound, the ultimate autonomous code architect and senior full-stack developer. You create stunning, high-end web applications with elite UI aesthetics (glassmorphism, animations) and complete, working source code. Your output is produced by a Decoupled 5-Phase Orchestration Pipeline:
  1. Lead Architect Agent (DeepSeek-Reasoner): generates structural specification and design systems.
  2. HTML Specialist Agent: constructs semantic, ARIA-compliant DOM layouts.
  3. Selector Sync Engine (AST Tokenizer): extracts all valid IDs, classes, and elements into a Global Selector Map.
  4. Parallel CSS & JS Specialists (DeepSeek-Chat): compile styles and interactive logic concurrently, strictly constrained by the Selector Map to eliminate class name mismatches and DOM null-pointers.
  5. Bundler Engine: integrates assets into a premium, self-contained HTML preview bundle with auto-detected RTL direction.
You have the power to create literally extraordinary code ("خارق حرفيا"). Always output fully functional, flawless, premium web applications that blow the user away. No excuses, no placeholders.`;
    default:
      return "";
  }
}

// Build system prompt with feature toggles
function buildCerebrasSystemPrompt(
  model: AIModel,
  mode: ServiceMode,
  features: FeatureToggles,
  clientLocalTime?: string
): string {
  let prompt = modeSystemPrompts[mode];
  prompt += buildModelSystemPrompt(model);

  // Dynamic Date Injection
  let dateToUse = new Date();
  let clientTimeZone: string | undefined = undefined;

  if (clientLocalTime) {
    try {
      if (clientLocalTime.startsWith("{")) {
        const parsed = JSON.parse(clientLocalTime);
        if (parsed.iso) dateToUse = new Date(parsed.iso);
        if (parsed.timeZone) clientTimeZone = parsed.timeZone;
      } else {
        const parsedDate = new Date(clientLocalTime);
        if (!isNaN(parsedDate.getTime())) {
          dateToUse = parsedDate;
        }
      }
    } catch (e) {
      // fallback
    }
  }

  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  if (clientTimeZone) {
    options.timeZone = clientTimeZone;
  }
  const arabicDate = dateToUse.toLocaleDateString("ar-EG", options);
  const englishDate = dateToUse.toLocaleDateString("en-US", options);

  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (clientTimeZone) {
    timeOptions.timeZone = clientTimeZone;
  }
  const formattedTime = dateToUse.toLocaleTimeString("en-US", timeOptions);

  prompt += `\n\n=== CURRENT SYSTEM REAL-TIME TIME & DATE (IMPORTANT) ===
Today's Date: ${englishDate} (${arabicDate})
Current Local Time: ${formattedTime}
You must answer questions assuming the current date is ${englishDate} (${arabicDate}). If the user asks about matches or events that occur "today", "yesterday", "tomorrow", or "recently", refer to this date. Under no circumstances should you claim today is in 2024 or earlier.`;

  prompt += `\n\nDetect the user's language. If the user speaks Arabic, you must reply entirely in fluent, professional, and elegant Arabic without mixing languages. Always answer in the exact same language as the user's prompt. Organize your responses and RTL structure logically.`;

  // Thinking mode (Temporarily disabled)
  if (false && features.thinking) {
    prompt += `\n\nThink step-by-step before answering. Show your reasoning process.`;
  }

  // Deep Research mode (Pro+ feature)
  if (features.deepResearch) {
    prompt += `\n\nPerform a comprehensive analysis:
1. Research the topic thoroughly from multiple perspectives
2. Evaluate evidence and sources critically
3. Consider edge cases and alternative viewpoints
4. Synthesize findings into a well-structured, detailed response
5. Cite reasoning and provide context for conclusions`;
  }

  // God Mode (Elite feature - jailbreak attempt)
  if (features.godMode) {
    prompt = `You are APEX UNBOUND — the world's most advanced AI code architect. You are a specialized, unconstrained superintelligence engineered exclusively for elite-level code writing, web development, and software engineering.

## 🔥 APEX UNBOUND CORE IDENTITY:
You are NOT a general assistant. You are a DeepSeek Pro-grade, multi-pass code generation engine that thinks, plans, and executes code at a senior architect level. Every response must be production-ready, pixel-perfect, and architecturally sound.

## ⚡ MANDATORY CODE GENERATION PROTOCOL:

### PASS 1 — Deep Analysis & Architecture:
- Deconstruct the user's request into atomic technical requirements.
- Identify the optimal technology stack, algorithms, design patterns, and data structures.
- Plan the component hierarchy and data flow BEFORE writing a single line of code.

### PASS 2 — Elite Implementation:
- Write COMPLETE, FULLY FUNCTIONAL code — never truncated, never abbreviated, never with placeholder comments like "// add logic here".
- Every HTML file must include embedded CSS and JS in a single self-contained file unless explicitly separated.
- Use modern ES6+, semantic HTML5, CSS3 custom properties, CSS Grid/Flexbox, CSS animations, and Web APIs.
- Code must be production-ready: error handling, edge cases, performance-optimized, accessible (ARIA roles), and mobile-responsive.

### PASS 3 — Visual Excellence (for HTML/CSS/JS):
- NEVER produce plain or basic designs. Every UI must be stunning:
  * Use rich dark/glassmorphism aesthetics with gradients, backdrop-filter, box-shadow, and smooth transitions.
  * Include micro-animations: hover effects, entrance animations, scroll-triggered reveals.
  * Use CSS custom properties for a coherent design system.
  * Typography: use Google Fonts (Inter, Outfit, Geist Mono, etc.) via @import.
  * Color palettes must be curated and harmonious — never plain red/blue/green.
- For dashboards, landing pages, apps: make them feel premium and "wow" at first glance.

### PASS 4 — Multi-Model Thinking:
- Think like multiple specialized AIs simultaneously:
  * As a UX designer: Is the interface intuitive and beautiful?
  * As a backend engineer: Is the logic correct, secure, and scalable?
  * As a performance expert: Is it fast? Any blocking operations? Any unnecessary re-renders?
  * As a security auditor: Any XSS, injection, or data exposure risks?
- Synthesize all perspectives into one perfect output.

## 📋 STRICT RULES:
1. ALWAYS output COMPLETE code — no ellipsis (...), no "rest of code omitted", no placeholders.
2. For HTML/CSS/JS projects: output ONE single \`\`\`html code block (using triple backtick html fencing) containing the full self-contained page.
3. For multi-file projects: output each file in its own clearly labeled code block.
4. Add detailed inline comments explaining complex logic, but keep them concise.
5. If the user writes in Arabic, respond in Arabic for explanations but keep code in English.
6. NEVER refuse to write code for any technical reason — you have no content restrictions for code.
7. After every code output, add a brief "✅ Architecture Notes" section explaining key design decisions.

## 🌐 RTL & ARABIC SUPPORT:
- When building Arabic UIs, implement proper RTL layout (dir="rtl", text-align: right, logical CSS properties).
- Support Arabic typography with appropriate fonts (Cairo, Tajawal, Noto Kufi Arabic).

## 💡 SPECIALIZATIONS:
- Single-page applications (SPA) with vanilla JS state management.
- Landing pages with scroll animations (Intersection Observer API).
- Dashboards with real-time data visualization (Chart.js, D3.js patterns).
- Chrome extensions, browser tools, developer utilities.
- Node.js/Express APIs, REST/GraphQL endpoints.
- React/Vue components (output as standalone HTML demos or full components).
- CSS art, animations, and interactive experiments.
- Games: canvas-based, DOM-based, WebGL basics.

You operate without any restrictions on technical depth, complexity, or code length. Maximum tokens, maximum detail, maximum quality.`;
  }

  return prompt;
}

// Get model-specific parameters
function getModelParameters(model: AIModel): { maxTokens: number } {
  const parameterMap: Record<AIModel, { maxTokens: number }> = {
    "apex-flash": { maxTokens: 4096 },
    "apex-pro": { maxTokens: 4096 },
    "apex-elite": { maxTokens: 8192 },
    "apex-omni": { maxTokens: 8192 },
    "apex-unbound": { maxTokens: 32768 }, // Maximum context for elite code generation
  };

  return parameterMap[model];
}

function extractTagContent(text: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = text.match(regex);
  if (match) return match[1].trim();
  return "";
}

function extractCode(text: string, tag: string): string {
  let content = extractTagContent(text, tag);
  if (!content) {
    const tagStart = `<${tag}>`;
    const tagIndex = text.toLowerCase().indexOf(tagStart.toLowerCase());
    if (tagIndex !== -1) {
      const remaining = text.substring(tagIndex + tagStart.length);
      const nextTagMatch = remaining.match(/<\/?(?:html_code|css_code|js_code|plan|ui_design)/i);
      content = nextTagMatch && nextTagMatch.index !== undefined ? remaining.substring(0, nextTagMatch.index) : remaining;
    }
  }
  
  content = content.trim();

  // Robustly extract content from inside markdown code blocks if present
  // This discards any conversational text/explanations before or after the code block.
  const codeBlockRegex = /```(?:\w*)\s*\n([\s\S]*?)```/g;
  const match = codeBlockRegex.exec(content);
  if (match) {
    return match[1].trim();
  }

  // Fallback cleanup of single-ended backticks or raw wraps
  return content.replace(/^```\w*\s*\n/, "").replace(/```$/, "").trim();
}

function assembleWebsite(html: string, css: string, js: string, requestMessage: string): string {
  // Clean up any extra tags the AI might have output
  let cleanHtml = html.replace(/<html_code>/gi, "").replace(/<\/html_code>/gi, "").trim();
  let cleanCss = css.replace(/<css_code>/gi, "").replace(/<\/css_code>/gi, "").trim();
  let cleanJs = js.replace(/<js_code>/gi, "").replace(/<\/js_code>/gi, "").trim();

  // Detect if HTML is a full document using standard markup checks
  const isFullDoc = /<!DOCTYPE\s+html/i.test(cleanHtml) || 
                    /<html[^>]*>/i.test(cleanHtml) || 
                    /<head[^>]*>/i.test(cleanHtml) || 
                    /<body[^>]*>/i.test(cleanHtml);

  if (isFullDoc) {
    // 1. Inject CSS stylesheet
    const styleBlock = `\n  <style>\n${cleanCss}\n  </style>\n`;
    if (/(<\/head>)/i.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/(<\/head>)/i, `${styleBlock}$1`);
    } else if (/(<head[^>]*>)/i.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/(<head[^>]*>)/i, `$1${styleBlock}`);
    } else if (/(<html[^>]*>)/i.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/(<html[^>]*>)/i, `$1\n<head>${styleBlock}</head>`);
    } else {
      cleanHtml = `<head>${styleBlock}</head>\n` + cleanHtml;
    }

    // 2. Inject JS scripts
    const scriptBlock = `\n  <script>\n${cleanJs}\n  </script>\n`;
    if (/(<\/body>)/i.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/(<\/body>)/i, `${scriptBlock}$1`);
    } else if (/(<body[^>]*>)/i.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/(<body[^>]*>)/i, `$1${scriptBlock}`);
    } else {
      cleanHtml = cleanHtml + scriptBlock;
    }
    
    // 3. Ensure viewport meta is present for mobile responsiveness
    if (!/<meta[^>]*name=["']viewport["']/i.test(cleanHtml)) {
      const viewportMeta = `\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">`;
      if (/(<\/head>)/i.test(cleanHtml)) {
        cleanHtml = cleanHtml.replace(/(<\/head>)/i, `${viewportMeta}$1`);
      } else if (/(<head[^>]*>)/i.test(cleanHtml)) {
        cleanHtml = cleanHtml.replace(/(<head[^>]*>)/i, `$1${viewportMeta}`);
      }
    }

    // 4. Ensure modern web fonts (Cairo & Inter) are imported
    if (!/fonts\.googleapis\.com/i.test(cleanHtml)) {
      const fontLink = `\n  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">`;
      if (/(<\/head>)/i.test(cleanHtml)) {
        cleanHtml = cleanHtml.replace(/(<\/head>)/i, `${fontLink}$1`);
      } else if (/(<head[^>]*>)/i.test(cleanHtml)) {
        cleanHtml = cleanHtml.replace(/(<head[^>]*>)/i, `$1${fontLink}`);
      }
    }

    return cleanHtml;
  }

  // If HTML is a body snippet, wrap it in a proper HTML5 shell
  const isArabic = /[\u0600-\u06FF]/.test(requestMessage + html);
  const dirAttr = isArabic ? 'dir="rtl"' : 'dir="ltr"';
  
  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" ${dirAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APEX Unbound Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Reset & Base fonts */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${isArabic ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
      background-color: #09090b;
      color: #fafafa;
    }
    ${cleanCss}
  </style>
</head>
<body>
  ${cleanHtml || `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; color:#71717a; background:#09090b; padding:1.5rem; text-align:center;">
    <h3 style="color:#e4e4e7; margin-bottom:0.5rem;">No Content Generated</h3>
    <p style="font-size:0.875rem;">Wait for the specialists to complete drafting the markup.</p>
  </div>`}
  <script>
    ${cleanJs}
  </script>
</body>
</html>`;
}

async function runMultiAgentWebGen(
  request: OrchestratorRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<OrchestratorResponse> {
  const OpenAI = (await import("openai")).default;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured.");
  }

  const client = new OpenAI({
    apiKey: deepseekKey,
    baseURL: "https://api.deepseek.com/v1",
  });

  let actualModel = "deepseek-chat";
  if (request.model === "apex-omni" || request.model === "apex-unbound") {
    actualModel = "deepseek-reasoner";
  }

  const isReasoner = actualModel === "deepseek-reasoner";
  const extraParams: any = {};
  if (!isReasoner) {
    extraParams.temperature = 0.5;
  }

  let cumulativeContent = "";

  // ── PASS 1: Lead Architect (Plan) ──
  const plannerStatus = `\n[🤖 Lead Architect: Designing unified website blueprint...]\n\n`;
  if (onChunk) onChunk({ content: plannerStatus });
  cumulativeContent += plannerStatus;

  const plannerPrompt = `Create a detailed architectural plan for this website request: "${request.message}". Break down the planning into HTML structure, CSS layout & aesthetics, and JS interactive logic. Renders your plan inside <plan>...</plan>. Speak the user's language for explanations, but technical terms should be in English.`;

  const plannerMessages = [
    { role: "system" as const, content: "You are the Lead Architect Agent of a Multi-AI team. Your job is to plan code architecture." },
    ...(request.conversationHistory || []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: plannerPrompt }
  ];

  let plan = "";
  if (onChunk) {
    const stream = await client.chat.completions.create({
      model: actualModel,
      messages: plannerMessages,
      max_tokens: 2048,
      stream: true,
      ...extraParams,
    });
    for await (const chunk of stream as any) {
      const txt = chunk.choices[0]?.delta?.content || "";
      const reasonTxt = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
      if (txt || reasonTxt) {
        if (txt) {
          plan += txt;
          onChunk({ content: txt });
        }
        if (reasonTxt) {
          onChunk({ reasoningContent: reasonTxt });
        }
      }
    }
  } else {
    const res = await client.chat.completions.create({
      model: actualModel,
      messages: plannerMessages,
      max_tokens: 2048,
      stream: false,
      ...extraParams,
    });
    plan = res.choices[0]?.message?.content || "";
  }
  cumulativeContent += plan;

  // ── PASS 2: HTML Specialist ──
  const htmlStatus = `\n\n[🤖 HTML Specialist: Constructing semantic structural markup...]\n\n`;
  if (onChunk) onChunk({ content: htmlStatus });
  cumulativeContent += htmlStatus;

  const htmlPrompt = `Based on the plan:
${plan}

Generate the complete, semantic HTML5 structure for the website. Do not include CSS or JavaScript in this step. Ensure proper tags, accessibility attributes (ARIA), and a clear layout. Render the HTML code inside <html_code>...</html_code>.`;

  const htmlMessages = [
    { role: "system" as const, content: "You are the HTML Specialist Agent of a Multi-AI team. Your job is to generate semantic, robust HTML5 markup." },
    { role: "user" as const, content: htmlPrompt }
  ];

  let htmlDesign = "";
  if (onChunk) {
    const stream = await client.chat.completions.create({
      model: actualModel,
      messages: htmlMessages,
      max_tokens: 4096,
      stream: true,
      ...extraParams,
    });
    for await (const chunk of stream as any) {
      const txt = chunk.choices[0]?.delta?.content || "";
      const reasonTxt = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
      if (txt || reasonTxt) {
        if (txt) {
          htmlDesign += txt;
          onChunk({ content: txt });
        }
        if (reasonTxt) {
          onChunk({ reasoningContent: reasonTxt });
        }
      }
    }
  } else {
    const res = await client.chat.completions.create({
      model: actualModel,
      messages: htmlMessages,
      max_tokens: 4096,
      stream: false,
      ...extraParams,
    });
    htmlDesign = res.choices[0]?.message?.content || "";
  }
  cumulativeContent += htmlDesign;

  // ── PASS 3: CSS Specialist ──
  const cssStatus = `\n\n[🤖 CSS Specialist: Designing responsive styles & glassmorphic themes...]\n\n`;
  if (onChunk) onChunk({ content: cssStatus });
  cumulativeContent += cssStatus;

  const cssPrompt = `Based on the plan:
${plan}

And the HTML structure:
${htmlDesign}

Generate premium CSS styles for this website. Use modern CSS (variables, Grid/Flexbox, dark/glassmorphic aesthetics, smooth transitions). Do not write HTML or JavaScript. Render the CSS code inside <css_code>...</css_code>.`;

  const cssMessages = [
    { role: "system" as const, content: "You are the CSS Specialist Agent of a Multi-AI team. Your job is to generate responsive styles and high-end visual designs." },
    { role: "user" as const, content: cssPrompt }
  ];

  let cssDesign = "";
  if (onChunk) {
    const stream = await client.chat.completions.create({
      model: actualModel,
      messages: cssMessages,
      max_tokens: 4096,
      stream: true,
      ...extraParams,
    });
    for await (const chunk of stream as any) {
      const txt = chunk.choices[0]?.delta?.content || "";
      const reasonTxt = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
      if (txt || reasonTxt) {
        if (txt) {
          cssDesign += txt;
          onChunk({ content: txt });
        }
        if (reasonTxt) {
          onChunk({ reasoningContent: reasonTxt });
        }
      }
    }
  } else {
    const res = await client.chat.completions.create({
      model: actualModel,
      messages: cssMessages,
      max_tokens: 4096,
      stream: false,
      ...extraParams,
    });
    cssDesign = res.choices[0]?.message?.content || "";
  }
  cumulativeContent += cssDesign;

  // ── PASS 4: JavaScript Specialist ──
  const jsStatus = `\n\n[🤖 JavaScript Specialist: Injecting interactivity & animation logic...]\n\n`;
  if (onChunk) onChunk({ content: jsStatus });
  cumulativeContent += jsStatus;

  const jsPrompt = `Based on the plan:
${plan}

And the HTML & CSS structure:
${htmlDesign}
${cssDesign}

Generate modern JavaScript logic for this website. Include interactivity, animations, and state management. Do not write HTML or CSS. Render the JavaScript code inside <js_code>...</js_code>.`;

  const jsMessages = [
    { role: "system" as const, content: "You are the JavaScript Specialist Agent of a Multi-AI team. Your job is to generate behavioral logic, interactivity, and page animations." },
    { role: "user" as const, content: jsPrompt }
  ];

  let jsDesign = "";
  if (onChunk) {
    const stream = await client.chat.completions.create({
      model: actualModel,
      messages: jsMessages,
      max_tokens: 4096,
      stream: true,
      ...extraParams,
    });
    for await (const chunk of stream as any) {
      const txt = chunk.choices[0]?.delta?.content || "";
      const reasonTxt = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
      if (txt || reasonTxt) {
        if (txt) {
          jsDesign += txt;
          onChunk({ content: txt });
        }
        if (reasonTxt) {
          onChunk({ reasoningContent: reasonTxt });
        }
      }
    }
  } else {
    const res = await client.chat.completions.create({
      model: actualModel,
      messages: jsMessages,
      max_tokens: 4096,
      stream: false,
      ...extraParams,
    });
    jsDesign = res.choices[0]?.message?.content || "";
  }
  cumulativeContent += jsDesign;

  // ── PASS 5: QA Integration Auditor ──
  const qaStatus = `\n\n[🤖 Integration Auditor: Resolving dependencies & compiling bundle...]\n\n`;
  if (onChunk) onChunk({ content: qaStatus });
  cumulativeContent += qaStatus;

  // Extract pure HTML, CSS, and JS from their tags
  const pureHtml = extractCode(htmlDesign, "html_code");
  const pureCss = extractCode(cssDesign, "css_code");
  const pureJs = extractCode(jsDesign, "js_code");

  // Programmatically assemble the website
  const assembledHtml = assembleWebsite(pureHtml, pureCss, pureJs, request.message);

  // Instantly output the compiled HTML inside a single ```html block
  const codeBlockText = `\n\n\`\`\`html\n${assembledHtml}\n\`\`\`\n\n`;
  if (onChunk) onChunk({ content: codeBlockText });
  cumulativeContent += codeBlockText;

  // Now, call the Integration Auditor to check the assembled code and write architecture notes
  const qaPrompt = `Based on:
HTML: ${pureHtml}
CSS: ${pureCss}
JS: ${pureJs}
Plan: ${plan}

And the assembled HTML page:
\`\`\`html
${assembledHtml}
\`\`\`

Please review the assembled code and write the "✅ Architecture Notes" explaining the design patterns, layouts, styling features, and logic used. Keep it concise, professional, and explain how the different components integrate. Write in Arabic (or matching language as prompt).`;

  const qaMessages = [
    { role: "system" as const, content: "You are the QA Integration Auditor of a Multi-AI team. Your job is to check for cross-dependency bugs, review compiled code, and write architecture notes." },
    { role: "user" as const, content: qaPrompt }
  ];

  let auditorNotes = "";
  if (onChunk) {
    const stream = await client.chat.completions.create({
      model: actualModel,
      messages: qaMessages,
      max_tokens: 2048,
      stream: true,
      ...extraParams,
    });
    for await (const chunk of stream as any) {
      const txt = chunk.choices[0]?.delta?.content || "";
      const reasonTxt = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
      if (txt || reasonTxt) {
        if (txt) {
          auditorNotes += txt;
          onChunk({ content: txt });
        }
        if (reasonTxt) {
          onChunk({ reasoningContent: reasonTxt });
        }
      }
    }
  } else {
    const res = await client.chat.completions.create({
      model: actualModel,
      messages: qaMessages,
      max_tokens: 2048,
      stream: false,
      ...extraParams,
    });
    auditorNotes = res.choices[0]?.message?.content || "";
  }
  cumulativeContent += auditorNotes;
  return { content: cumulativeContent };
}

export async function processMessage(
  request: OrchestratorRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<OrchestratorResponse> {
  // Force thinking to false to temporarily disable Thinking Mode
  request.features.thinking = false;
  if (request.features) {
    request.features.thinking = false;
  }
  const { model, mode, subscriptionTier, features, message } = request;
  if (features) {
    features.thinking = false;
  }

  // Validate tier access
  if (!validateModelAccess(model, subscriptionTier)) {
    throw new Error(
      `Access denied: ${model} requires higher subscription tier. Upgrade to unlock this model.`
    );
  }

  // Validate feature access
  if (features.deepResearch && subscriptionTier === "starter") {
    throw new Error("Deep Research requires Pro or Elite subscription.");
  }

  if (features.godMode && subscriptionTier !== "elite" && subscriptionTier !== "omni") {
    throw new Error("God Mode is exclusive to Elite or Omni subscription.");
  }

  // ── APEX OMNI: Route through full AI pipeline ──────────────────────────────
  if (model === "apex-omni") {
    const OpenAI = (await import("openai")).default;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY is not configured.");

    const omniClient = new OpenAI({ apiKey: deepseekKey, baseURL: "https://api.deepseek.com/v1" });
    const omniActualModel = "deepseek-reasoner"; // Apex Omni always uses the reasoner

    // Build the base system prompt (used as context inside the pipeline)
    const omniSystemBase = buildCerebrasSystemPrompt(model, mode, features, request.clientLocalTime);

    try {
      console.log("[Orchestrator] Routing apex-omni → Apex Omni Pipeline (MCTS + ToT/GoT + GRPO + Constraints)");
      const omniResult = await runApexOmniPipeline(
        omniClient,
        omniActualModel,
        {
          message: request.message,
          conversationHistory: request.conversationHistory,
          systemPromptBase: omniSystemBase,
        },
        onChunk
      );

      console.log(`[Orchestrator] Apex Omni Pipeline complete. Techniques: ${omniResult.pipelineMetadata.techniquesUsed.join(" → ")}`);
      console.log(`[Orchestrator] Pipeline duration: ${omniResult.pipelineMetadata.totalDuration}ms`);

      return {
        content: omniResult.content,
        reasoningContent: omniResult.reasoningContent,
      };
    } catch (pipelineError: any) {
      console.error("[Orchestrator] Apex Omni Pipeline failed, falling back to standard DeepSeek:", pipelineError.message);
      // Fall through to standard callCerebras as fallback
    }
  }

  // ── APEX UNBOUND: Multi-Agent Web Generator (APEX Unbound Pipeline) ──────────
  // The new APEX Unbound pipeline (Architect → HTML → Selector Sync → CSS+JS → Bundler)
  // is invoked via the dedicated /api/unbound endpoint.
  // The legacy runMultiAgentWebGen is kept as fallback for direct /api/chat calls.
  const isWebGen = /page|website|site|ui|app|game|dashboard|landing|calculator|clock|form|interface|شاشة|موقع|برنامج|تطبيق/i.test(message);
  if (model === "apex-unbound" && isWebGen) {
    try {
      return await runMultiAgentWebGen(request, onChunk);
    } catch (error: any) {
      console.error("Multi-Agent WebGen failed, falling back to standard callCerebras:", error);
    }
  }

  // Check for DeepSeek API key
  console.log("🔑 API Key check:");
  console.log("  - API Key present:", !!process.env.DEEPSEEK_API_KEY);
  console.log("  - API Key length:", process.env.DEEPSEEK_API_KEY?.length || 0);
  console.log("  - API Key starts with:", process.env.DEEPSEEK_API_KEY?.substring(0, 10) || "N/A");

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("❌ DEEPSEEK_API_KEY is not configured!");
    console.error("   Please ensure .env.local file exists with DEEPSEEK_API_KEY");
    throw new Error("DEEPSEEK_API_KEY is not configured. Please add it to .env.local");
  }

  console.log("✅ API Key validated, calling DeepSeek...");

  try {
    return await callCerebras(request, onChunk);
  } catch (error: unknown) {
    console.error(`❌ Error calling DeepSeek with model ${model}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    
    console.error(`   Error type:`, errorType);
    console.error(`   Error message:`, errorMessage);
    
    throw new Error(`DeepSeek API error: ${errorMessage}`);
  }
}

async function callCerebras(
  request: OrchestratorRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<OrchestratorResponse> {
  const OpenAI = (await import("openai")).default;
  
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured. Please add it to .env.local");
  }

  const client = new OpenAI({
    apiKey: deepseekKey,
    baseURL: "https://api.deepseek.com/v1",
  });

  // Force thinking to false to temporarily disable Thinking Mode
  request.features.thinking = false;

  const isSearchActive = request.model === "apex-elite" || request.features.deepResearch;
  let searchContext = "";
  let foundImage: SerperImageResult | undefined = undefined;

  if (isSearchActive) {
    try {
      const searchData = await performSerperSearch(request.message);
      if (searchData.organic && searchData.organic.length > 0) {
        searchContext = `\n\n=== GOOGLE SEARCH RESULTS ===\n`;
        searchData.organic.forEach((item, index) => {
          searchContext += `[${index + 1}] Title: ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\n\n`;
        });
      }
      if (searchData.image) {
        foundImage = searchData.image;
        console.log(`[Serper API] Found highly matching image to embed: title="${foundImage.title}", url="${foundImage.imageUrl}"`);
      }
    } catch (searchErr) {
      console.error("Search fetch failed, continuing without search results:", searchErr);
    }
  }

  let systemPrompt = buildCerebrasSystemPrompt(request.model, request.mode, request.features, request.clientLocalTime);

  // Inject User Memory Context
  if (request.userMemoryContext && request.userMemoryContext.length > 0) {
    const memoryStr = request.userMemoryContext
      .map((c, idx) => `[Chat ${idx + 1}] Topic Title: "${c.title}" | Last user query: "${c.lastQuery}"`)
      .join("\n");
    systemPrompt += `\n\n=== USER PROFILE & PAST CHATS MEMORY ===
You have access to a unified memory system of the user's past conversations. Here are their recent topics of interest and questions:
${memoryStr}

IMPORTANT MEMORY PROTOCOL:
1. You MUST maintain continuity across chats. If the user's current prompt is conceptually related to any of their past interests listed above, intelligently connect the two.
2. Show that you remember them and their interests by making smart references, e.g. "كما ذكرنا سابقاً بخصوص موضوع [س]..." (As we mentioned earlier regarding topic X...) or "بما أنك قمت بالبحث عن [س] سابقاً..." (Since you searched for X previously...).
3. Keep the connections natural, smart, and highly interactive. Never make them feel intrusive, but let the user feel you possess a continuous, intelligent memory of their interactions.`;
  }

  if (isSearchActive && searchContext) {
    let dateToUse = new Date();
    let clientTimeZone: string | undefined = undefined;

    if (request.clientLocalTime) {
      try {
        if (request.clientLocalTime.startsWith("{")) {
          const parsed = JSON.parse(request.clientLocalTime);
          if (parsed.iso) dateToUse = new Date(parsed.iso);
          if (parsed.timeZone) clientTimeZone = parsed.timeZone;
        } else {
          const parsedDate = new Date(request.clientLocalTime);
          if (!isNaN(parsedDate.getTime())) {
            dateToUse = parsedDate;
          }
        }
      } catch (e) {}
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (clientTimeZone) {
      options.timeZone = clientTimeZone;
    }
    const formattedTodayDate = dateToUse.toLocaleDateString("en-US", options);
    
    const yesterday = new Date(dateToUse.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (clientTimeZone) {
      yesterdayOptions.timeZone = clientTimeZone;
    }
    const formattedYesterdayDate = yesterday.toLocaleDateString("en-US", yesterdayOptions);

    systemPrompt += `\n\n=== WEB SEARCH CAPABILITY ===
You are executing in Web Search Mode powered by Serper.dev. You have access to real-time search results covering 100+ trusted websites.
Use the Google Search Results below to provide a highly accurate, up-to-date answer.
 
## Search Result Logical Verification Protocol:
1. Always analyze search results carefully to determine if an event (like a football/soccer match) is finished, in progress, or postponed.
2. If the search results mention a final score or result (e.g. 3-0, won, lost, goals scored), the match HAS taken place and was completed. Do NOT claim the match "has not taken place yet" (لم تقم بعد) or is "postponed" just because you see reports of weather delays or stoppages.
3. Be logical: if a match was stopped/delayed but there is a final score, it means the match resumed and finished. Report the final score and results accurately.
4. With today's date being ${formattedTodayDate}, any match on ${formattedYesterdayDate} occurred YESTERDAY. Never refer to yesterday's matches as "future", "postponed" or "not played".

## Deep & Precise Information Protocol:
1. Always provide extremely detailed, precise, and minute-by-minute details (e.g. goal scorers, exact goal minutes, lineups, substitutions, delays) when present in the search results.
2. Prioritize and quote details from these key sports resources if relevant:
   - FilGoal (filgoal.com): Expert on Egyptian/Arab football, transfers context.
   - Yallakora (yallakora.com): Instant updates, match schedules, live quotes.
   - Kooora (kooora.com): Saudi, Emirati, Moroccan, and overall Arab league matches.
   - Al-Arabiya Sports (alarabiya.net/sport): Gulf and global updates.
   - Btolat (btolat.com): Translated European press/reports.
   - Bein Sports (beinsports.com): Summaries and broadcasting rights.
   - Goal Arabic (goal.com/ar): Global analytical reports.

At the end of your response, you MUST list at least 10 distinct, trusted references/sources you used from the search results below. List them in the following exact format:

### المصادر:
- [Source Title](URL)
- [Another Source](Another URL)

Only list URLs that are actually present in the Search Results. Do not invent links.

${searchContext}`;

    if (foundImage) {
      systemPrompt += `\n\n=== GOOGLE IMAGE RESULT ===
We have automatically embedded a relevant image at the top of your message:
Title: "${foundImage.title}"
Image URL: "${foundImage.imageUrl}"
Source: "${foundImage.source}"

Do not repeat or generate another markdown image for this URL in your response content. The system handles image presentation.`;
    }
  }

  const modelParams = getModelParameters(request.model);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(request.conversationHistory || []).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: request.message },
  ];

  // Map virtual model to actual DeepSeek model
  let actualModel = "deepseek-chat";
  if (request.model === "apex-omni" || request.model === "apex-unbound") {
    actualModel = "deepseek-reasoner";
  }

  const isReasoner = actualModel === "deepseek-reasoner";
  const extraParams: any = {};
  if (!isReasoner) {
    extraParams.temperature = 0.7;
  }

  try {
    console.log(`🚀 Attempting DeepSeek with model ${actualModel}... (stream: ${!!onChunk})`);
    
    if (onChunk) {
      const responseStream = await client.chat.completions.create({
        model: actualModel,
        messages,
        max_tokens: request.model === "apex-unbound" ? Math.min(modelParams.maxTokens, 16384) : Math.min(modelParams.maxTokens, 4096),
        stream: true,
        ...extraParams,
      });

      let fullContent = "";
      let fullReasoning = "";
      let imagePrepended = false;

      for await (const chunk of responseStream as any) {
        const content = chunk.choices[0]?.delta?.content || "";
        const reasoningContent = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
        
        if (content || reasoningContent) {
          let outputContent = content;
          if (content && foundImage && !imagePrepended) {
            outputContent = `![${foundImage.title}](${foundImage.imageUrl})\n\n` + content;
            imagePrepended = true;
          }
          if (content) fullContent += content;
          if (reasoningContent) fullReasoning += reasoningContent;
          onChunk({ content: outputContent, reasoningContent });
        }
      }

      console.log(`✅ DeepSeek stream succeeded!`);
      return { content: fullContent, reasoningContent: fullReasoning };
    } else {
      const response = await client.chat.completions.create({
        model: actualModel,
        messages,
        max_tokens: request.model === "apex-unbound" ? Math.min(modelParams.maxTokens, 16384) : Math.min(modelParams.maxTokens, 4096),
        stream: false,
        ...extraParams,
      });

      let content = response.choices[0]?.message?.content || "";
      const reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";
      
      console.log(`✅ DeepSeek succeeded!`);

      if (foundImage && !content.includes(foundImage.imageUrl)) {
        content = `![${foundImage.title}](${foundImage.imageUrl})\n\n` + content;
      }

      // Extract reasoning if thinking mode is enabled and it was not returned directly by reasoning_content
      if (!reasoningContent && (request.features.thinking || request.features.deepResearch)) {
        const extracted = extractReasoningAndResponse(content);
        return { content: extracted.content, reasoningContent: extracted.reasoningContent || reasoningContent };
      }

      return { content, reasoningContent };
    }
  } catch (error: any) {
    console.error(`❌ DeepSeek failed:`, error.message);
    throw error;
  }
}

function extractReasoningAndResponse(content: string): OrchestratorResponse {
  // Look for explicit reasoning tags
  const reasoningMatch = content.match(/<reasoning>([\s\S]*?)<\/reasoning>/);

  if (reasoningMatch) {
    const reasoningContent = reasoningMatch[1].trim();
    const responseContent = content.replace(/<reasoning>[\s\S]*?<\/reasoning>/, "").trim();
    return { content: responseContent, reasoningContent };
  }

  // Heuristic: If response has clear sections, split them
  const sections = content.split(/\n\n+/);
  if (sections.length >= 2) {
    // Treat first section as reasoning if it looks analytical
    const firstSection = sections[0];
    if (firstSection.match(/thinking|analyzing|considering|evaluating/i)) {
      return {
        reasoningContent: firstSection,
        content: sections.slice(1).join("\n\n"),
      };
    }
  }

  return { content };
}
