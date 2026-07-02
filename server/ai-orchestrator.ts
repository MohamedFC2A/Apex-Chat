import type { AIModel, ServiceMode, FeatureToggles, SubscriptionTier, ModelTierMap } from "@shared/schema";
import {
  buildQuizGenerationInstructions,
  buildQuizRepairInstructions,
  detectQuizIntent as detectStructuredQuizIntent,
  formatQuizAsCodeBlock,
  parseQuizRequest,
  tryParseQuizFromText,
  extractQuizTopic,
} from "@shared/mcq";
import {
  buildPdfGenerationInstructions,
  buildPdfRepairInstructions,
  detectPdfIntent as detectStructuredPdfIntent,
  formatPdfAsCodeBlock,
  parsePdfRequest,
  tryParsePdfFromText,
  normalizePdfObject,
} from "@shared/pdf";
import { runApexOmniPipeline } from "./apex-omni/pipeline.js";
import { getDeepSeekRequestParams, mapDeepSeekModelForTask } from "./deepseek-model-router.js";
import { runApexSearch, buildApexSearchContext } from "./apex-search-engine.js";
import { buildApexFootballContext } from "./apex-football-engine.js";

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
  userMemoryContext?: Array<{ title: string; lastQuery: string; summary?: string; relevance?: number; updatedAt?: number }>;
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

function isQuizIntent(message: string): boolean {
  return /(?:^|\s)(mcq|msq|quiz|exam|test)(?:\s|$)|اختبار|امتحان|اسئلة اختيار|اختيار من متعدد|سؤال(?:ات)?/i.test(message);
}

function hasMCQQuizBlock(content: string): boolean {
  return /```mcq-quiz\s*[\r\n]+[\s\S]*?```/i.test(content);
}

function hasPDFDocumentBlock(content: string): boolean {
  return /```pdf-document\s*[\r\n]+[\s\S]*?```/i.test(content);
}

function quizMentionsTopic(content: string, topic: string): boolean {
  const normalizedTopic = topic.trim().toLowerCase();
  if (!normalizedTopic || normalizedTopic === "موضوع عام") return true;
  return content.toLowerCase().includes(normalizedTopic);
}

function buildQuizFocusedMessage(message: string, conversationHistory?: Array<{ role: string; content: string }>): string {
  const topic = extractQuizTopic(message, conversationHistory);
  return `The user is explicitly asking for a multiple-choice quiz.
Original user message: ${message}
Required topic: ${topic}
Requirements:
- Generate the quiz now without asking follow-up questions.
- If the user did not specify the number of questions, generate 5 questions.
- Default difficulty: medium.
- Default mode: practice.
- The quiz must be specifically about the required topic, not general knowledge.
- Return it only in the mcq-quiz JSON format.`;
}

async function forceQuizBlockResponse(
  client: any,
  model: string,
  userMessage: string,
  responseText: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
  systemPrompt?: string
): Promise<string> {
  const inferredTopic = extractQuizTopic(userMessage, conversationHistory);
  const formatterMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: `${systemPrompt}\n${MCQ_GENERATION_PROTOCOL}` }] : []),
    {
      role: "system" as const,
      content: `The user has already requested a quiz and provided enough information.
You must generate the final quiz now.
Never ask a follow-up question.
If the user did not specify the number of questions, default to 5.
If the user did not specify the level, default to medium.
If the user did not specify the mode, default to practice.
If the topic is short or slightly misspelled, infer the intended academic topic from the user message and continue.
The inferred topic from the user's message is: "${inferredTopic}".
The quiz must actually be about that topic, not a generic topic.
Generate the quiz specifically about: "${inferredTopic}".
Return only one valid \`\`\`mcq-quiz fenced block with valid JSON.`
    },
    ...conversationHistory.slice(-4).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user" as const,
      content: `User request:\n${userMessage}\n\nRequired topic:\n${inferredTopic}\n\nPrevious assistant response that failed formatting:\n${responseText}\n\nGenerate the quiz now in the required mcq-quiz JSON format, specifically about the required topic above.`
    }
  ];

  const formatted = await client.chat.completions.create({
    model,
    messages: formatterMessages,
    max_tokens: 4096,
    stream: false,
    ...getDeepSeekRequestParams(model, 0.4),
  });

  return formatted.choices[0]?.message?.content || responseText;
}

function streamTextChunks(
  text: string,
  onChunk: (chunk: { content?: string; reasoningContent?: string }) => void,
  chunkSize = 220
) {
  for (let index = 0; index < text.length; index += chunkSize) {
    onChunk({ content: text.slice(index, index + chunkSize) });
  }
}

async function generateDedicatedQuizResponse(
  client: any,
  actualModel: string,
  request: OrchestratorRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<OrchestratorResponse> {
  const quizRequest = parseQuizRequest(request.message, request.conversationHistory);
  const maxTokens = Math.min(getModelParameters(request.model).maxTokens, 4096);
  const baseParams = getDeepSeekRequestParams(actualModel, 0.2);

  const buildMessages = (userContent: string) => [
    {
      role: "system" as const,
      content:
        "You are a dedicated structured quiz generation engine. Your only job is to produce accurate multiple-choice quizzes in strict mcq-quiz JSON format. Never chat conversationally. Never ask follow-up questions. Never output prose outside the mcq-quiz block.",
    },
    { role: "user" as const, content: userContent },
  ];

  const candidateContents: string[] = [];

  const runAttempt = async (userContent: string) => {
    const response = await client.chat.completions.create({
      model: actualModel,
      messages: buildMessages(userContent),
      max_tokens: maxTokens,
      stream: false,
      ...baseParams,
    });

    const content = response.choices[0]?.message?.content || "";
    const reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";
    candidateContents.push(content);

    const quiz = tryParseQuizFromText(content, quizRequest);
    return { content, reasoningContent, quiz };
  };

  const firstAttempt = await runAttempt(buildQuizGenerationInstructions(quizRequest));
  if (firstAttempt.quiz) {
    const formatted = formatQuizAsCodeBlock(firstAttempt.quiz);
    if (onChunk) {
      if (firstAttempt.reasoningContent) {
        onChunk({ reasoningContent: firstAttempt.reasoningContent });
      }
      streamTextChunks(formatted, onChunk);
    }
    return { content: formatted, reasoningContent: firstAttempt.reasoningContent || undefined };
  }

  const secondAttempt = await runAttempt(
    buildQuizRepairInstructions(quizRequest, candidateContents[candidateContents.length - 1] || request.message)
  );
  if (secondAttempt.quiz) {
    const formatted = formatQuizAsCodeBlock(secondAttempt.quiz);
    if (onChunk) {
      if (secondAttempt.reasoningContent) {
        onChunk({ reasoningContent: secondAttempt.reasoningContent });
      }
      streamTextChunks(formatted, onChunk);
    }
    return { content: formatted, reasoningContent: secondAttempt.reasoningContent || undefined };
  }

  const finalContent = candidateContents[candidateContents.length - 1] || firstAttempt.content || "";
  const fallbackContent = hasMCQQuizBlock(finalContent) ? finalContent : `\`\`\`mcq-quiz\n${JSON.stringify({
    title: quizRequest.language === "ar" ? `اختبار ${quizRequest.topic}` : `${quizRequest.topic} Quiz`,
    description:
      quizRequest.language === "ar"
        ? `تعذر تطبيع الرد بالكامل، لكن هذا مسار احتياطي لموضوع ${quizRequest.topic}`
        : `Fallback quiz response for ${quizRequest.topic}`,
    mode: quizRequest.mode,
    questions: [],
  }, null, 2)}\n\`\`\``;

  if (onChunk) {
    streamTextChunks(fallbackContent, onChunk);
  }

  return {
    content: fallbackContent,
    reasoningContent: secondAttempt.reasoningContent || firstAttempt.reasoningContent || undefined,
  };
}

async function generateDedicatedPdfResponse(
  client: any,
  actualModel: string,
  request: OrchestratorRequest,
  onChunk?: (chunk: { content?: string; reasoningContent?: string }) => void
): Promise<OrchestratorResponse> {
  const pdfRequest = parsePdfRequest(request.message);
  const maxTokens = 8192; // DeepSeek chat and reasoner support up to 8K output tokens for large content capacity
  const baseParams = getDeepSeekRequestParams(actualModel, 0.2);

  const buildMessages = (userContent: string) => [
    {
      role: "system" as const,
      content:
        "You are a dedicated structured PDF document generation engine. Your only job is to produce a highly detailed, comprehensive, and complete PDFDocument JSON in strict pdf-document format, spanning up to 20 pages if necessary. Never chat conversationally. Never use placeholders. Never output prose outside the pdf-document block.",
    },
    { role: "user" as const, content: userContent },
  ];

  const candidateContents: string[] = [];

  const runAttempt = async (userContent: string) => {
    const response = await client.chat.completions.create({
      model: actualModel,
      messages: buildMessages(userContent),
      max_tokens: maxTokens,
      stream: false,
      ...baseParams,
    });

    const content = response.choices[0]?.message?.content || "";
    const reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";
    candidateContents.push(content);

    const planMatch = content.match(/<pdf-plan>([\s\S]*?)<\/pdf-plan>/i);
    const planText = planMatch ? planMatch[1].trim() : "";

    const document = tryParsePdfFromText(content, pdfRequest);
    return { content, reasoningContent, document, planText };
  };

  const firstAttempt = await runAttempt(buildPdfGenerationInstructions(pdfRequest));
  if (firstAttempt.document) {
    let formatted = formatPdfAsCodeBlock(firstAttempt.document);
    if (firstAttempt.planText) {
      const planHeading = pdfRequest.language === "ar" ? "### 📝 خطة وإبداع الذكاء الاصطناعي\n" : "### 📝 AI Planning & Creativity\n";
      formatted = `${planHeading}${firstAttempt.planText}\n\n${formatted}`;
    }
    if (onChunk) {
      if (firstAttempt.reasoningContent) {
        onChunk({ reasoningContent: firstAttempt.reasoningContent });
      }
      streamTextChunks(formatted, onChunk);
    }
    return { content: formatted, reasoningContent: firstAttempt.reasoningContent || undefined };
  }

  const secondAttempt = await runAttempt(
    buildPdfRepairInstructions(pdfRequest, candidateContents[candidateContents.length - 1] || request.message)
  );
  if (secondAttempt.document) {
    let formatted = formatPdfAsCodeBlock(secondAttempt.document);
    if (secondAttempt.planText) {
      const planHeading = pdfRequest.language === "ar" ? "### 📝 خطة وإبداع الذكاء الاصطناعي\n" : "### 📝 AI Planning & Creativity\n";
      formatted = `${planHeading}${secondAttempt.planText}\n\n${formatted}`;
    }
    if (onChunk) {
      if (secondAttempt.reasoningContent) {
        onChunk({ reasoningContent: secondAttempt.reasoningContent });
      }
      streamTextChunks(formatted, onChunk);
    }
    return { content: formatted, reasoningContent: secondAttempt.reasoningContent || undefined };
  }

  const finalContent = candidateContents[candidateContents.length - 1] || firstAttempt.content || "";
  const fallbackContent =
    hasPDFDocumentBlock(finalContent)
      ? finalContent
      : `\`\`\`pdf-document\n${JSON.stringify(
          {
            title: pdfRequest.language === "ar" ? `مستند ${pdfRequest.topic}` : `${pdfRequest.topic} Document`,
            subtitle:
              pdfRequest.language === "ar"
                ? `تعذر تطبيع الرد بالكامل، لكن هذا مسار احتياطي لموضوع ${pdfRequest.topic}`
                : `Fallback PDF response for ${pdfRequest.topic}`,
            language: pdfRequest.language,
            theme: "dark",
            pageSize: "a4",
            coverPage: pdfRequest.includeCoverPage,
            tableOfContents: pdfRequest.includeTableOfContents,
            sections: [
              {
                id: "section-1",
                type: "paragraph",
                direction: pdfRequest.language === "ar" ? "rtl" : "ltr",
                content:
                  pdfRequest.language === "ar"
                    ? `تعذر إنشاء المستند بالكامل، لكن هذا محتوى احتياطي لموضوع ${pdfRequest.topic}.`
                    : `Unable to normalize the document completely, but this is fallback content for ${pdfRequest.topic}.`,
              },
            ],
          },
          null,
          2
        )}\n\`\`\``;

  if (onChunk) {
    streamTextChunks(fallbackContent, onChunk);
  }

  return {
    content: fallbackContent,
    reasoningContent: secondAttempt.reasoningContent || firstAttempt.reasoningContent || undefined,
  };
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
  try {
    const apexResults = await runApexSearch(query, { intent: "answer" });
    const organic = apexResults.organic.slice(0, 12).map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }));
    const primaryImage = apexResults.imageAssets.find((asset) => asset.role === "hero") || apexResults.imageAssets[0];
    const selectedImage = primaryImage
      ? {
          title: primaryImage.title,
          imageUrl: primaryImage.optimizedUrl,
          source: primaryImage.source,
        }
      : apexResults.image;

    console.log(
      `[Apex Search] Server search selected ${organic.length} references and ${apexResults.imageAssets.length || apexResults.images.length} image candidates.`
    );
    return {
      organic,
      image: selectedImage
    };
  } catch (error) {
    console.error("[Apex Search] Error during search:", error);
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

const MCQ_GENERATION_PROTOCOL = `\n\n## MCQ QUIZ GENERATION PROTOCOL:
When the user asks for a quiz, exam, test, multiple-choice questions, or MCQ content, you MUST output the quiz inside a single fenced code block labeled \`\`\`mcq-quiz.

Rules:
1. Output valid JSON only inside the mcq-quiz block. No comments, no trailing commas, no prose before or after the block unless the user explicitly asks for explanation outside the quiz.
2. The JSON schema must be:
{
  "title": "Quiz title",
  "description": "Short description",
  "mode": "practice" or "exam",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": {
        "a": "Option A",
        "b": "Option B",
        "c": "Option C",
        "d": "Option D"
      },
      "correctAnswer": "a",
      "explanation": "A clear explanation of why the correct answer is correct."
    }
  ]
}
3. Each quiz must contain at least 3 questions unless the user requests a different number.
4. Use exactly 4 options per question unless the user explicitly requests otherwise.
5. Match the user's language exactly. If the user writes in Arabic, all quiz fields and explanations must be in Arabic.
6. Default to "practice" mode unless the user explicitly asks for an exam/final-test style flow.`;

const PDF_GENERATION_PROTOCOL = `\n\n## PDF DOCUMENT GENERATION PROTOCOL:
When the user asks for a PDF, report, document, exported document, or professional file, you MUST output the result inside a single fenced code block labeled \`\`\`pdf-document.

Rules for Highly Detailed, Structured, and Dense Documents (Supporting up to 20 Pages):
1. Output valid JSON only inside the pdf-document block. No comments, no trailing commas, and no prose before or after the block.
2. The JSON schema must include:
{
  "title": "Document title",
  "subtitle": "Optional subtitle detailing context",
  "language": "ar" or "en" or "mixed",
  "theme": "dark" or "light" or "auto",
  "pageSize": "a4" or "letter",
  "coverPage": true,
  "tableOfContents": true,
  "sections": [
    {
      "id": "section-1",
      "type": "heading" or "paragraph" or "code" or "math" or "table" or "list" or "image" or "divider" or "quote" or "callout" or "qa",
      "content": "Section content",
      "level": 1 | 2 | 3 | 4,
      "language": "python",
      "direction": "rtl" or "ltr",
      "items": ["list item 1", "list item 2"],
      "headers": ["Col 1", "Col 2"],
      "rows": [["Row 1 Col 1", "Row 1 Col 2"]],
      "variant": "info" | "warning" | "success" | "error",
      "caption": "Optional caption",
      "question": "Question text for type: qa",
      "answer": "Answer text for type: qa"
    }
  ]
}
3. Density and Structure: The document must be exceptionally detailed, exhaustive, and massive. Split the topic into multiple headings (H1, H2, H3, H4) followed by deep, highly comprehensive paragraphs. Each paragraph section must be at least 150-250 words long to ensure deep analytical coverage. Avoid shortcuts, placeholders, or brief summaries. Use 25 to 45 sections of various types: heading, paragraph, list, table, code, math, quote, callout, qa, and divider. The document must easily scale to 10-20 A4 pages when printed.
4. Tables: Include comprehensive, data-rich comparison tables comparing multiple features, specs, or parameters. Columns should have descriptive headers and rows must contain complete data without placeholders.
5. Lists & Callouts: Use lists to outline key points, and callouts to highlight warnings, info, success, or errors with appropriate variants.
6. Q&A Blocks: Use the "qa" section type to construct detailed FAQ or question-and-answer sections (question and answer fields).
7. Formatting details:
   - Highlight key terms in paragraphs/lists using ==highlighted text==.
   - Include inline mathematical equations using \\( ... \\) or $...$ syntax.
   - For code sections, include the language and write complete, well-commented code.
8. Match the user's language exactly, and use RTL direction for Arabic text.
9. Return only one valid \`\`\`pdf-document fenced block.`;

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
  prompt += MCQ_GENERATION_PROTOCOL;
  prompt += PDF_GENERATION_PROTOCOL;
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

  const actualModel = mapDeepSeekModelForTask(request.model, "reasoning");
  const extraParams = getDeepSeekRequestParams(actualModel, 0.5);

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

/**
 * V2 Macro-Intent Verification Gateway
 *
 * Implements the Explicit Generation Request Scale from the V2 blueprint.
 * Requires BOTH an imperative action verb AND a structural output keyword
 * to achieve a confidence score ≥ 0.85 and trigger widget generation.
 *
 * Confidence tiers:
 *   0.10 — Conversational reference  → markdown prose only
 *   0.30 — Loose speculative mention → suggest interaction link
 *   0.95 — Explicit operational cmd  → trigger widget rendering
 */
export function verifyWidgetGenerationIntent(prompt: string): { triggerQuiz: boolean; triggerPDF: boolean } {
  const cleanPrompt = prompt.trim();

  // ── Explicit Operational Commands (confidence ≥ 0.95) ──
  // MUST contain an imperative action verb + structural output noun together
  const executionQuizRegex = /(انشئ|اعمل|صمم|generate|create|build|اضبط|امتحنني|اسألني|سوي|ابني|انشء)\s*(امتحان|اختبار|quiz|test|mcq|msq|أسئلة\s+اختيار|اختيار\s+من\s+متعدد)/i;
  const executionPDFRegex  = /(انشئ|اعمل|صمم|generate|create|build|نزلي|صدّر|export|حول\s+ل|اكتب\s+ملف)\s*(pdf|ملف\s+pdf|document|تقرير|مستند|وثيقة)/i;

  // ── Speculative / Conversational Guards (block false positives) ──
  // These patterns indicate the user is asking ABOUT a concept, not commanding generation
  const speculativeQuizPatterns = [
    /(هل\s+في|هل\s+عندك|هل\s+يمكن|هل\s+هناك|في\s+امتحان|في\s+اختبار)/i,
    /(is\s+there\s+a\s+quiz|any\s+questions\s+for|could\s+you\s+make|what\s+is\s+a\s+quiz)/i,
    /(يعني\s+ايه|كلمني\s+عن\s+شكل|اشرح\s+لي\s+نظام)/i,
  ];
  const speculativePDFPatterns = [
    /(هل\s+يمكن|ممكن\s+تعمل|can\s+you\s+make|could\s+you\s+export|what\s+is\s+a\s+pdf)/i,
    /(يعني\s+ايه|كلمني\s+عن|اشرح\s+لي)/i,
  ];

  const isSpeculativeQuiz = speculativeQuizPatterns.some(p => p.test(cleanPrompt));
  const isSpeculativePDF  = speculativePDFPatterns.some(p => p.test(cleanPrompt));

  const triggerQuiz = executionQuizRegex.test(cleanPrompt) && !isSpeculativeQuiz;
  const triggerPDF  = executionPDFRegex.test(cleanPrompt)  && !isSpeculativePDF;

  if (triggerQuiz || triggerPDF) {
    console.log(`[V2 Intent Gateway] Widget authorized — Quiz: ${triggerQuiz}, PDF: ${triggerPDF}`);
  } else {
    console.log(`[V2 Intent Gateway] Widget blocked — no explicit operational command detected`);
  }

  return { triggerQuiz, triggerPDF };
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

  const componentIntent = verifyWidgetGenerationIntent(request.message);

  if (componentIntent.triggerPDF && detectStructuredPdfIntent(request.message)) {
    const OpenAI = (await import("openai")).default;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured. Please add it to .env.local");
    }

    const pdfClient = new OpenAI({
      apiKey: deepseekKey,
      baseURL: "https://api.deepseek.com/v1",
    });

    const pdfModel = "deepseek-reasoner";
    return await generateDedicatedPdfResponse(pdfClient, pdfModel, request, onChunk);
  }

  if (componentIntent.triggerQuiz && detectStructuredQuizIntent(request.message)) {
    const OpenAI = (await import("openai")).default;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured. Please add it to .env.local");
    }

    const quizClient = new OpenAI({
      apiKey: deepseekKey,
      baseURL: "https://api.deepseek.com/v1",
    });

    const quizTask = request.model === "apex-flash" ? "generation" : "reasoning";
    const quizModel = mapDeepSeekModelForTask(request.model, quizTask);
    return await generateDedicatedQuizResponse(quizClient, quizModel, request, onChunk);
  }

  // ── APEX OMNI: Route through full AI pipeline ──────────────────────────────
  if (model === "apex-omni") {
    const OpenAI = (await import("openai")).default;
    let omniActualModel = process.env.APEX_OMNI_MODEL || (process.env.OPENROUTER_API_KEY ? "google/gemini-2.5-flash:free" : "deepseek-chat");
    if (omniActualModel.includes("rerank") || omniActualModel === "nvidia/llama-nemotron-rerank-vl-1b-v2:free") {
      console.warn(`[Orchestrator] APEX_OMNI_MODEL '${omniActualModel}' is a reranker. Falling back to google/gemini-2.5-flash:free for completions.`);
      omniActualModel = "google/gemini-2.5-flash:free";
    }
    const isOpenRouter = omniActualModel.includes("/") || omniActualModel.includes("free") || omniActualModel === "google/gemini-2.5-flash:free";

    let omniClient: any;
    if (isOpenRouter) {
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) throw new Error("OPENROUTER_API_KEY is not configured.");
      omniClient = new OpenAI({
        apiKey: openRouterKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://apex-chat.vercel.app",
          "X-Title": "Apex Chat",
        }
      });
    } else {
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY is not configured.");
      omniClient = new OpenAI({ apiKey: deepseekKey, baseURL: "https://api.deepseek.com/v1" });
    }
    
    // Evaluate Prompt Complexity
    const evaluatePromptComplexity = (msg: string, hist: Array<{ role: string; content: string }> = []): number => {
      let score = 1;
      const complexKeywords = [
        /\b(solve|explain|prove|derive|optimize|refactor|design|architect|debug|analyze|calculate|math|algorithm|mcts|tot)\b/i,
        /(حل|شرح|تصميم|رياضيات|حساب|برمجة|تحسين|خوارزمية|خطوة بخطوة)/i,
        /code|شيفرة|كود/i
      ];
      for (const kw of complexKeywords) {
        if (kw.test(msg)) score += 2;
      }
      if (msg.length > 600) score += 3;
      else if (msg.length > 200) score += 1.5;
      if (hist.length > 6) score += 2;
      else if (hist.length > 2) score += 1;
      return Math.min(10, Math.max(1, score));
    };

    const complexity = evaluatePromptComplexity(request.message, request.conversationHistory);
    console.log(`[Complexity Profiler] Score: ${complexity}/10`);

    // Level 1 Stream: Direct Token Return (Complexity <= 3)
    if (complexity <= 3) {
      console.log(`[Orchestrator] Level 1 Stream: Direct Token Return (Complexity ${complexity} <= 3)`);
      if (onChunk) {
        onChunk({ content: `**[Phase 1] Level 1 Stream: Direct Token Return**\n` });
        onChunk({ content: `> Low complexity detected (${complexity}/10). Initiating direct token stream...\n\n` });
      }
      const fastModel = isOpenRouter ? omniActualModel : "deepseek-chat";
      const messages = [
        { role: "system" as const, content: buildCerebrasSystemPrompt("apex-flash", mode, features, request.clientLocalTime) },
        ...(request.conversationHistory || []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: request.message }
      ];

      let content = "";
      if (onChunk) {
        const stream = await omniClient.chat.completions.create({
          model: fastModel,
          messages,
          max_tokens: 2048,
          stream: true,
          temperature: 0.5
        });
        for await (const chunk of stream as any) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            content += text;
            onChunk({ content: text });
          }
        }
      } else {
        const response = await omniClient.chat.completions.create({
          model: fastModel,
          messages,
          max_tokens: 2048,
          stream: false,
          temperature: 0.5
        });
        content = response.choices[0]?.message?.content || "";
      }
      return { content };
    }

    // Level 2 Stream: RAG + Vision Reranking (3 < Complexity < 7)
    if (complexity > 3 && complexity < 7) {
      console.log(`[Orchestrator] Level 2 Stream: RAG + Vision Reranking (Complexity ${complexity})`);
      if (onChunk) {
        onChunk({ content: `**[Phase 1] Level 2 Stream: RAG + Vision Reranking**\n` });
        onChunk({ content: `> Medium complexity detected (${complexity}/10). Performing web search & vision reranking...\n` });
      }
      
      const searchResponse = await runApexSearch(request.message, { intent: "answer" });
      const searchContext = buildApexSearchContext(searchResponse);
      
      if (onChunk) {
        onChunk({ content: `> Context aggregation complete. Streaming response...\n\n` });
      }

      let systemPrompt = buildCerebrasSystemPrompt("apex-elite", mode, features, request.clientLocalTime);
      systemPrompt += `\n\n=== CONTEXT AGGREGATION (RAG & VISION RERANKED) ===\n${searchContext}`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(request.conversationHistory || []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: request.message }
      ];

      let content = "";
      if (onChunk) {
        const stream = await omniClient.chat.completions.create({
          model: isOpenRouter ? omniActualModel : "deepseek-chat",
          messages,
          max_tokens: 3072,
          stream: true,
          temperature: 0.6
        });
        for await (const chunk of stream as any) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            content += text;
            onChunk({ content: text });
          }
        }
      } else {
        const response = await omniClient.chat.completions.create({
          model: isOpenRouter ? omniActualModel : "deepseek-chat",
          messages,
          max_tokens: 3072,
          stream: false,
          temperature: 0.6
        });
        content = response.choices[0]?.message?.content || "";
      }
      return { content };
    }

    // Level 3 Stream: Full Reasoning Engine (Complexity >= 7)
    console.log(`[Orchestrator] Level 3 Stream: Full Reasoning Engine (Complexity ${complexity} >= 7)`);
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
  const isSynthesisPrompt = request.message.includes("responses generated by the cognitive agents:") || request.message.includes("responses generated by the 10 cognitive agents:");
  const quizIntent = isSynthesisPrompt ? false : isQuizIntent(request.message);
  const inferredQuizTopic = quizIntent ? extractQuizTopic(request.message, request.conversationHistory) : "";
  let searchContext = "";
  let foundImage: SerperImageResult | undefined = undefined;
  let footballContext = "";

  if (isSearchActive) {
    try {
      const footballData = await buildApexFootballContext(request.message, request.clientLocalTime);
      if (footballData.used) {
        footballContext = footballData.context;
        console.log(`[Apex Search] API-Football context selected (${footballData.sourceCount} compact sources).`);
        if (footballData.answer) {
          onChunk?.({ content: footballData.answer });
          return { content: footballData.answer };
        }
      } else {
        const searchData = await performSerperSearch(request.message);
        if (searchData.organic && searchData.organic.length > 0) {
          searchContext = `\n\n=== GOOGLE SEARCH RESULTS ===\n`;
          searchData.organic.forEach((item, index) => {
            searchContext += `[${index + 1}] Title: ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\n\n`;
          });
        }
        if (searchData.image) {
          foundImage = searchData.image;
          console.log(`[Apex Search] Found highly matching image to embed: title="${foundImage.title}", url="${foundImage.imageUrl}"`);
        }
      }
    } catch (searchErr) {
      console.error("Search fetch failed, continuing without search results:", searchErr);
    }
  }

  let systemPrompt = buildCerebrasSystemPrompt(request.model, request.mode, request.features, request.clientLocalTime);
  systemPrompt += `\n\n=== ANTI-HALLUCINATION AND CONTEXT PRIORITY ===
Context priority order:
1. The user's current message and any ATTACHMENT_EVIDENCE block.
2. Structured tool/API data supplied by Apex Search.
3. Recent conversation history.
4. Relevance-ranked memory from past chats.

If the answer is not supported by the current prompt, attachment evidence, tool data, or recent history, say that the information is not available instead of guessing.
When ATTACHMENT_EVIDENCE is present, quote or summarize only what was extracted. Clearly say "not found in the attachment" for missing details.`;

  // Inject User Memory Context
  if (request.userMemoryContext && request.userMemoryContext.length > 0) {
    const memoryStr = request.userMemoryContext
      .map((c, idx) => `[Memory ${idx + 1}] Title: "${c.title}" | Relevance: ${typeof c.relevance === "number" ? c.relevance.toFixed(2) : "n/a"} | Last user query: "${c.lastQuery}"${c.summary ? `\nSummary:\n${c.summary}` : ""}`)
      .join("\n");
    systemPrompt += `\n\n=== USER PROFILE & PAST CHATS MEMORY ===
You have access to compact, relevance-ranked memory from the user's past conversations. Treat this as contextual memory, not as verified evidence.
${memoryStr}

IMPORTANT MEMORY PROTOCOL:
1. Use memory only when it is directly relevant to the current request.
2. Never invent facts from memory. If the current prompt or attached files conflict with memory, prioritize the current prompt and attachments.
3. Do not mention memory unless it materially improves the answer.
4. For file/PDF/image questions, attachment evidence is stronger than memory.`;
  }

  if (isSearchActive && (searchContext || footballContext)) {
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

    systemPrompt += `\n\n=== APEX SEARCH DATA LAYER ===
You are executing in Apex Search mode. You may receive structured API-Football data and/or Google Search Results.
If an "API-FOOTBALL LIVE DATA" section exists, treat it as the primary authority for football fixtures, match status, score, live state, postponement, recent form, and upcoming fixtures. Do not override it with generic web snippets.
Use the available data below to provide a highly accurate, up-to-date answer.
 
## Search Result Logical Verification Protocol:
1. For football, use API-Football status first: LIVE means currently playing, Finished means already played, Not started means future, and postponed/cancelled/suspended must be stated exactly.
2. If structured fixture data includes a final score or result, the match HAS taken place and was completed. Do NOT claim the match "has not taken place yet" (لم تقم بعد).
3. If API-Football data directly answers the question, answer concisely from it and avoid dumping unrelated search references.
4. With today's date being ${formattedTodayDate}, any match on ${formattedYesterdayDate} occurred YESTERDAY. Never refer to yesterday's matches as "future", "postponed" or "not played".

## Deep & Precise Information Protocol:
1. Provide precise match state, score, competition, venue, date, and event details only when present in the supplied data.
2. For football questions with API-Football data, cite "API-Football v3 structured data" as the source; do not force 10 web links.
3. For non-football Google-only answers, prioritize and quote details from these key sports resources if relevant:
   - FilGoal (filgoal.com): Expert on Egyptian/Arab football, transfers context.
   - Yallakora (yallakora.com): Instant updates, match schedules, live quotes.
   - Kooora (kooora.com): Saudi, Emirati, Moroccan, and overall Arab league matches.
   - Al-Arabiya Sports (alarabiya.net/sport): Gulf and global updates.
   - Btolat (btolat.com): Translated European press/reports.
   - Bein Sports (beinsports.com): Summaries and broadcasting rights.
   - Goal Arabic (goal.com/ar): Global analytical reports.

At the end of your response:
- If API-Football data was used, list one source line: "API-Football v3 structured data".
- If only Google Search Results were used, list the trusted URLs actually present in the Search Results. Do not invent links.

### المصادر:
- [Source Title](URL)
- [Another Source](Another URL)

Only list URLs that are actually present in the Search Results. Do not invent links.

${footballContext}
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

  const effectiveUserMessage = quizIntent ? buildQuizFocusedMessage(request.message, request.conversationHistory) : request.message;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(request.conversationHistory || []).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: effectiveUserMessage },
  ];

  const task = request.model === "apex-unbound" || request.model === "apex-omni" ? "reasoning" : "generation";
  const actualModel = mapDeepSeekModelForTask(request.model, task);
  const extraParams = getDeepSeekRequestParams(actualModel, 0.7);

  try {
    console.log(`🚀 Attempting DeepSeek with model ${actualModel}... (stream: ${!!onChunk})`);

    if (quizIntent && onChunk) {
      const response = await client.chat.completions.create({
        model: actualModel,
        messages,
        max_tokens: request.model === "apex-unbound" ? Math.min(modelParams.maxTokens, 16384) : Math.min(modelParams.maxTokens, 4096),
        stream: false,
        ...extraParams,
      });

      let content = response.choices[0]?.message?.content || "";
      const reasoningContent = (response.choices[0]?.message as any)?.reasoning_content || "";

      if (!hasMCQQuizBlock(content) || !quizMentionsTopic(content, inferredQuizTopic)) {
        content = await forceQuizBlockResponse(
          client as any,
          actualModel,
          request.message,
          content,
          request.conversationHistory || [],
          systemPrompt
        );
      }

      if (foundImage && !content.includes(foundImage.imageUrl)) {
        content = `![${foundImage.title}](${foundImage.imageUrl})\n\n` + content;
      }

      if (reasoningContent) {
        onChunk({ reasoningContent });
      }
      streamTextChunks(content, onChunk);

      console.log(`✅ DeepSeek quiz response normalized and streamed.`);
      return { content, reasoningContent };
    }

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

      if (quizIntent && (!hasMCQQuizBlock(content) || !quizMentionsTopic(content, inferredQuizTopic))) {
        content = await forceQuizBlockResponse(
          client as any,
          actualModel,
          request.message,
          content,
          request.conversationHistory || [],
          systemPrompt
        );
      }

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

export async function refinePdfDocumentWithAI(
  document: any,
  prompt: string
): Promise<any> {
  const OpenAI = (await import("openai")).default;
  const apiKey = process.env.DEEPSEEK_API_KEY || "";
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });

  const systemPrompt = `You are a professional PDF document structure refinement engine.
Your input is a complete PDFDocument JSON object and a refinement instruction.
Your ONLY job is to modify the PDFDocument JSON according to the instruction and return the updated PDFDocument JSON inside a single \`\`\`pdf-document block.
Do not change the JSON structure or schema.
Every section in the output MUST have a valid 'id', 'type', and 'content'.
If sections are added or re-ordered, make sure all ids are unique.
Supported section types: "heading", "paragraph", "code", "math", "table", "list", "image", "divider", "quote", "callout".
For code blocks, ensure 'language' is set. For lists, 'items' array. For tables, 'headers' and 'rows' arrays.
Respond ONLY with the \`\`\`pdf-document codeblock containing the updated JSON. Do not write any explanations before or after the codeblock.`;

  const userPrompt = `Existing PDFDocument:
${JSON.stringify(document, null, 2)}

Refinement Instruction:
${prompt}`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      ...getDeepSeekRequestParams("deepseek-reasoner"),
    });

    const content = response.choices[0]?.message?.content || "";
    const pdfBlock = content.match(/```pdf-document\s*([\s\S]*?)```/i);
    const jsonText = pdfBlock ? pdfBlock[1].trim() : content.trim();
    const parsed = JSON.parse(jsonText);
    const normalized = normalizePdfObject(parsed);
    if (normalized) return normalized;
    return document;
  } catch (error) {
    console.error("AI PDF Refinement failed:", error);
    return document;
  }
}

export async function generateStructuredPdfFromText(
  text: string
): Promise<any> {
  const OpenAI = (await import("openai")).default;
  const apiKey = process.env.DEEPSEEK_API_KEY || "";
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });

  const systemPrompt = `You are an expert content-to-PDF compiler.
Your job is to read the provided text and compile it into a highly detailed, comprehensive, beautifully structured PDFDocument JSON representing a professional document that can easily span up to 20 pages when printed.
You must wrap the resulting JSON inside a single \`\`\`pdf-document block.
Do not write any markdown outside the \`\`\`pdf-document block.
Follow the PDFDocument schema:
{
  "title": "Clear concise document title",
  "subtitle": "Optional subtitle detailing context",
  "author": "Apex AI Editor",
  "date": "YYYY-MM-DD",
  "language": "ar" | "en" | "mixed",
  "theme": "dark" | "light" | "auto",
  "pageSize": "a4" | "letter",
  "coverPage": true,
  "tableOfContents": true,
  "sections": [
    {
      "id": "unique-id-1",
      "type": "heading" | "paragraph" | "code" | "math" | "table" | "list" | "image" | "divider" | "quote" | "callout" | "qa",
      "content": "Text content here...",
      "level": 1 | 2 | 3 | 4,
      "language": "python",
      "items": ["list item 1", "list item 2"],
      "headers": ["Col 1", "Col 2"],
      "rows": [["Row 1 Col 1", "Row 1 Col 2"]],
      "direction": "rtl" | "ltr",
      "variant": "info" | "warning" | "success" | "error",
      "caption": "Optional caption",
      "question": "Question text for type: qa",
      "answer": "Answer text for type: qa"
    }
  ]
}
Design the document outline with maximum capacity and detail:
1. Expand and elaborate on all concepts. Do not summarize or use placeholders. Write full, dense paragraphs of text.
2. Structure the document into 15 to 35 logical sections with proper headings (H1 to H4).
3. Convert comparisons or lists of items to data-rich tables (using headers and rows arrays) or lists.
4. Add relevant callouts for important warnings, notes, or tips, choosing appropriate variants (info, warning, success, error).
5. Add Q&A blocks (type: "qa", question, answer) for FAQs or detailed clarifications.
6. Support inline math via \\( ... \\) or $...$, and key highlighting via ==text==.
Generate a cohesive title and cover page config. Respond ONLY with the \`\`\`pdf-document JSON codeblock.`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      ...getDeepSeekRequestParams("deepseek-reasoner"),
    });

    const content = response.choices[0]?.message?.content || "";
    const pdfBlock = content.match(/```pdf-document\s*([\s\S]*?)```/i);
    const jsonText = pdfBlock ? pdfBlock[1].trim() : content.trim();
    const parsed = JSON.parse(jsonText);
    const normalized = normalizePdfObject(parsed);
    if (normalized) return normalized;
    throw new Error("Failed to parse AI-generated PDF document");
  } catch (error) {
    console.error("AI PDF Generation from text failed:", error);
    throw error;
  }
}
