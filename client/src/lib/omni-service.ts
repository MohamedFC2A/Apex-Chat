import { apiRequest } from "@/lib/queryClient";
import { sendAIMessage, clientPerformSerperSearch } from "@/lib/ai-client";
import type { ChatResponse, Message } from "@shared/schema";

export interface AgentDraft {
  model: "architect" | "coder" | "security" | "researcher" | "creative" | "linguist" | "skeptic" | "psychologist" | "futurist" | "optimizer";
  status: "loading" | "drafting" | "complete";
  draft: string;
  response?: string;
}

export interface OmniState {
  step: "dispatch" | "drafting" | "synthesizing" | "complete";
  agents: Record<string, AgentDraft>;
  finalResponse?: string;
  totalDuration?: number;
  sources?: Array<{ title: string; url: string; domain: string }>;
}

const AGENT_CONFIGS = {
  architect: {
    name: "The Architect",
    model: "apex-pro" as const,
    color: "#10a37f",
    icon: "🏗️",
    systemPrompt:
      "Focus on high-level planning, strategy, and architectural decisions. Break down complex problems into structured solutions. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  coder: {
    name: "The Coder",
    model: "apex-pro" as const,
    color: "#4285f4",
    icon: "💻",
    systemPrompt:
      "Focus strictly on code implementation, syntax correctness, and technical accuracy. Provide clean, efficient code. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  security: {
    name: "The Security Officer",
    model: "apex-pro" as const,
    color: "#ef4444",
    icon: "🛡️",
    systemPrompt:
      "Analyze for security vulnerabilities, potential exploits, edge cases, and safety issues. Think like a penetration tester. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  researcher: {
    name: "The Researcher",
    model: "apex-pro" as const,
    color: "#8b5cf6",
    icon: "📚",
    systemPrompt:
      "Provide factual accuracy, data verification, historical context, and citations. Research deeply and verify claims. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  creative: {
    name: "The Creative",
    model: "apex-flash" as const,
    color: "#f59e0b",
    icon: "🎨",
    systemPrompt:
      "Focus on innovation, creativity, and out-of-the-box thinking. Generate unique ideas and creative solutions. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  linguist: {
    name: "The Linguist",
    model: "apex-flash" as const,
    color: "#22c55e",
    icon: "🗣️",
    systemPrompt:
      "Focus on tone, grammar, natural language flow, and ensuring the output is native-quality (especially in Arabic). Polish the language to perfection. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  skeptic: {
    name: "The Skeptic",
    model: "apex-pro" as const,
    color: "#dc2626",
    icon: "🔍",
    systemPrompt:
      "Think critically and find flaws in logic, assumptions, and reasoning. Challenge ideas constructively. Play devil's advocate. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  psychologist: {
    name: "The Psychologist",
    model: "apex-flash" as const,
    color: "#ec4899",
    icon: "🧠",
    systemPrompt:
      "Focus on user experience, empathy, human-centered design, and emotional intelligence. Consider the user's perspective and needs. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  futurist: {
    name: "The Futurist",
    model: "apex-flash" as const,
    color: "#06b6d4",
    icon: "🚀",
    systemPrompt:
      "Focus on modern trends, emerging technologies, best practices, and future-proof solutions. Think ahead. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
  optimizer: {
    name: "The Optimizer",
    model: "apex-pro" as const,
    color: "#84cc16",
    icon: "⚡",
    systemPrompt:
      "Focus on performance, efficiency, speed optimization, and resource management. Find the fastest, most efficient solution. Detect the user's language and respond in that language. If the user speaks Arabic, reply entirely in Arabic without mixing languages.",
  },
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callAgent(
  agentType: keyof typeof AGENT_CONFIGS,
  message: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  searchContext?: string
): Promise<string> {
  const config = AGENT_CONFIGS[agentType];
  
  try {
    const formattedHistory = (conversationHistory || []).map((h, i) => ({
      id: i,
      role: h.role,
      content: h.content,
      userId: 1,
      createdAt: new Date().toISOString()
    })) as unknown as Message[];

    let customPrompt = config.systemPrompt;
    if (agentType === "researcher" && searchContext) {
      customPrompt += `\n\n=== GOOGLE REAL-TIME SEARCH RESULTS ===\nUse the following real-time data to answer the user request:\n${searchContext}`;
    }

    const response = await sendAIMessage(
      `${customPrompt}\n\nUser: ${message}`,
      config.model,
      formattedHistory,
      "standard",
      false,
      {
        thinking: false,
        deepResearch: false,
        godMode: false
      },
      "none"
    );
    
    return response.content;
  } catch (error) {
    console.error(`Agent ${agentType} failed:`, error);
    throw error;
  }
}

export async function processOmniRequest(
  message: string,
  onStateUpdate: (state: OmniState) => void,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ChatResponse> {
  // Perform search once for the original user message at the very beginning of the pipeline
  let searchContext = "";
  try {
    const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY || "";
    const searchData = await clientPerformSerperSearch(message, deepseekKey);
    if (searchData.organic && searchData.organic.length > 0) {
      searchContext = searchData.organic
        .map((item, index) => `[${index + 1}] Title: ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}`)
        .join("\n\n");
    }
  } catch (err) {
    console.error("Search failed in processOmniRequest:", err);
  }

  // Initialize state
  const initialState: OmniState = {
    step: "dispatch",
    agents: {
      architect: { model: "architect", status: "loading", draft: "" },
      coder: { model: "coder", status: "loading", draft: "" },
      security: { model: "security", status: "loading", draft: "" },
      researcher: { model: "researcher", status: "loading", draft: "" },
      creative: { model: "creative", status: "loading", draft: "" },
      linguist: { model: "linguist", status: "loading", draft: "" },
      skeptic: { model: "skeptic", status: "loading", draft: "" },
      psychologist: { model: "psychologist", status: "loading", draft: "" },
      futurist: { model: "futurist", status: "loading", draft: "" },
      optimizer: { model: "optimizer", status: "loading", draft: "" },
    },
  };
  
  onStateUpdate(initialState);
  
  // Stage 1: Dispatch (brief pause)
  await delay(300);
  
  // Stage 2: TERRIFYING BACKEND - 10-Agent Cognitive Architecture
  let currentState: OmniState = { ...initialState, step: "drafting" };
  onStateUpdate(currentState);
  
  const agentTypes = Object.keys(AGENT_CONFIGS) as (keyof typeof AGENT_CONFIGS)[];
  
  const agentResults: Array<{ agentType: string; response: string }> = [];
  
  // Execute sequentially (one by one) to show a clean step-by-step progress
  for (const agentType of agentTypes) {
    const minDisplayTime = delay(1200); // Give user enough time to see the beautiful timeline animation
    
    currentState = {
      ...currentState,
      agents: {
        ...currentState.agents,
        [agentType]: {
          ...currentState.agents[agentType],
          status: "drafting",
          draft: `Analyzing via ${AGENT_CONFIGS[agentType].name}...`,
        },
      },
    };
    onStateUpdate(currentState);
    
    try {
      // Increased timeout from 15s to 45s to resolve API / connection latency timeouts
      const timeout = delay(45000).then(() => "__TIMEOUT__");
      const responseOrTimeout = await Promise.race([
        callAgent(agentType, message, conversationHistory, searchContext),
        timeout,
      ]);
      
      await minDisplayTime;
      
      const response = responseOrTimeout === "__TIMEOUT__" ? "" : (responseOrTimeout as string);
      if (responseOrTimeout === "__TIMEOUT__") {
        console.warn(`[Omni Service] Agent ${agentType} timed out after 45s.`);
      }
      
      currentState = {
        ...currentState,
        agents: {
          ...currentState.agents,
          [agentType]: {
            ...currentState.agents[agentType],
            status: "complete",
            draft: response ? response.substring(0, 60) + "..." : "Timeout",
            response,
          },
        },
      };
      onStateUpdate(currentState);
      
      agentResults.push({ agentType, response });
    } catch (error) {
      await minDisplayTime;
      currentState = {
        ...currentState,
        agents: {
          ...currentState.agents,
          [agentType]: {
            ...currentState.agents[agentType],
            status: "complete",
            draft: "Unavailable",
            response: "",
          },
        },
      };
      onStateUpdate(currentState);
      agentResults.push({ agentType, response: "" });
    }
  }
  
  // Stage 3: TERRIFYING LOGIC - Judge Model Scoring + Synthesis
  currentState = {
    ...currentState,
    step: "synthesizing",
  };
  onStateUpdate(currentState);
  
  // CHAIN OF DENSITY: Score agent responses
  const scoredResults = await scoreAgentResponses(agentResults, message);
  
  // Build synthesis prompt using all successful agent results
  const synthesisPrompt = buildSynthesisPrompt(scoredResults, message);
  
  const finalHistory: Message[] = (conversationHistory || []).map((m, idx) => ({
    id: `history_${idx}`,
    role: m.role,
    content: m.content,
    timestamp: Date.now()
  }));

  // Final synthesis using sendAIMessage for real-time streaming
  try {
    const finalResponse = await sendAIMessage(
      synthesisPrompt,
      "apex-pro", // Use APEX Pro for synthesis reasoning (no search trigger)
      finalHistory,
      "standard",
      false, // isGodMode
      {
        thinking: true,
        deepResearch: false, // Disable search on the massive synthesis prompt
        godMode: false,
      },
      "thinking",
      (contentChunk, reasoningChunk) => {
        currentState = {
          ...currentState,
          step: "synthesizing",
          finalResponse: contentChunk,
        };
        onStateUpdate(currentState);
      }
    );
    
    if ((finalResponse as any).error) {
      throw new Error((finalResponse as any).message || (finalResponse as any).error);
    }
    
    onStateUpdate({
      step: "complete",
      agents: currentState.agents,
      finalResponse: finalResponse.content,
    });
    
    return finalResponse;
  } catch (error) {
    console.error("Synthesis failed:", error);
    
    // Fallback: combine all agent responses directly
    const fallback = agentResults
      .map(r => r.response)
      .filter(Boolean)
      .join("\n\n---\n\n");
    
    onStateUpdate({
      step: "complete",
      agents: currentState.agents,
      finalResponse: fallback || "Unable to generate response. Please try again.",
    });
    
    return {
      id: "fallback",
      content: fallback || "Unable to generate response. Please try again.",
      model: "apex-omni",
      conversationId: "",
    };
  }
}

// Stopwords definitions
const ARABIC_STOPWORDS = new Set([
  "من", "في", "على", "إلى", "عن", "مع", "هذا", "هذه", "هل", "ما", "ماذا", "كيف", "لماذا", "منذ", "حتى", 
  "كان", "كانت", "ان", "أن", "انه", "أنه", "التي", "الذي", "الذين", "لا", "نعم", "كل", "أم", "أو", "ثم", 
  "بل", "لكن", "لقد", "قد", "يا", "هو", "هي", "هم", "هن", "هما", "نحن", "أنا", "انت", "أنت", "انتم", 
  "أنتم", "بين", "حول", "تحت", "فوق", "أمام", "خلف", "داخل", "خارج", "عبر", "خلال", "يا", "لقد", "إذا"
]);

const ENGLISH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "where", "why", "how", "what", "who", 
  "which", "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", "being", "have", 
  "has", "had", "do", "does", "did", "to", "of", "in", "for", "on", "with", "at", "by", "from", "up", 
  "about", "into", "over", "after", "before", "out", "off", "your", "my", "our", "their", "his", "her", "its"
]);

function tokenizeAndClean(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A\s-]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 1);
}

// Optimized Cognitive Architecture Judge using TF-IDF & specializations
async function scoreAgentResponses(
  results: Array<{ agentType: string; response: string }>,
  originalQuery: string
): Promise<Array<{ agentType: string; response: string; score: number }>> {
  const queryTokens = tokenizeAndClean(originalQuery).filter(
    t => !ARABIC_STOPWORDS.has(t) && !ENGLISH_STOPWORDS.has(t)
  );

  // Categorize query to identify domain-expert agent
  const queryText = originalQuery.toLowerCase();
  let queryCategory: "coding" | "security" | "research" | "creative" | "ux" | "optimization" | "general" = "general";

  const codingKeywords = ["code", "function", "api", "database", "react", "typescript", "python", "html", "css", "كود", "برمجة", "دالة", "قاعدة بيانات", "موقع", "ملف"];
  const securityKeywords = ["security", "hack", "exploit", "vulnerability", "hacker", "encrypt", "cors", "xss", "csrf", "حماية", "أمن", "ثغرة", "تشفير", "اختراق"];
  const optimizationKeywords = ["speed", "slow", "performance", "memory", "optimize", "cache", "سرعة", "تحسين", "أداء", "بطء", "ذاكرة"];
  const uxKeywords = ["ux", "ui", "design", "layout", "color", "theme", "font", "واجهة", "تصميم", "ألوان", "شكل"];
  const researchKeywords = ["when", "who", "history", "date", "fact", "cite", "source", "متى", "من هو", "أين", "تاريخ", "معلومات", "مصدر", "مصادر"];
  const creativeKeywords = ["creative", "story", "poem", "write", "idea", "brainstorm", "قصة", "شعر", "أفكار", "إبداع", "تخيل"];

  if (codingKeywords.some(kw => queryText.includes(kw))) {
    queryCategory = "coding";
  } else if (securityKeywords.some(kw => queryText.includes(kw))) {
    queryCategory = "security";
  } else if (optimizationKeywords.some(kw => queryText.includes(kw))) {
    queryCategory = "optimization";
  } else if (uxKeywords.some(kw => queryText.includes(kw))) {
    queryCategory = "ux";
  } else if (researchKeywords.some(kw => queryText.includes(kw))) {
    queryCategory = "research";
  } else if (creativeKeywords.some(kw => queryText.includes(kw))) {
    queryCategory = "creative";
  }

  return results.map(result => {
    const response = result.response || "";
    
    // 1. Failure and error detection (force score 0 for crashed/timeout/error responses)
    const errorTerms = [
      "timeout", "unavailable", "access denied", "failed to process", "rate limit", 
      "error occurred", "error:", "api error", "فشل", "غير متاح", "انتهى الوقت", "خطأ"
    ];
    
    const responseLower = response.toLowerCase();
    const isShort = response.length < 150;
    const hasError = errorTerms.some(term => responseLower.includes(term));
    if (isShort && hasError) {
      return { ...result, score: 0 };
    }

    let score = 0;

    // 2. Length-based completeness (up to 20 points)
    score += Math.min(response.length / 100, 20);

    // 3. Structural elements (up to 30 points)
    const paragraphCount = (response.match(/\n/g) || []).length;
    score += Math.min(paragraphCount * 2, 10); // structure layout

    const codeBlockCount = (response.match(/```/g) || []).length / 2;
    score += Math.min(codeBlockCount * 10, 20); // code block rewards

    const hasMarkdownList = response.includes("- ") || response.includes("* ") || /\d+\.\s/.test(response);
    const hasHeaders = response.includes("# ");
    const hasTables = response.includes("|");
    if (hasMarkdownList) score += 3;
    if (hasHeaders) score += 3;
    if (hasTables) score += 4;

    // 4. TF-IDF & Overlap Relevance (up to 50 points)
    if (queryTokens.length > 0) {
      const responseTokens = tokenizeAndClean(response);
      const responseTokenSet = new Set(responseTokens);
      
      // Calculate token match overlap
      let uniqueMatches = 0;
      let totalMatches = 0;
      
      queryTokens.forEach(token => {
        if (responseTokenSet.has(token)) {
          uniqueMatches++;
          // Count exact occurrences
          let matches = 0;
          let pos = responseLower.indexOf(token);
          while (pos !== -1) {
            matches++;
            pos = responseLower.indexOf(token, pos + token.length);
          }
          totalMatches += Math.min(matches, 3); // limit impact of word-stuffing
        }
      });

      const overlapRatio = uniqueMatches / queryTokens.length;
      score += overlapRatio * 35; // base overlap relevance (up to 35)
      score += Math.min(totalMatches * 3, 15); // occurrences frequency reward (up to 15)

      // Exact phrase match bonus for queries of length >= 2 terms
      if (queryTokens.length >= 2) {
        const cleanQueryStr = queryTokens.join(" ");
        if (responseLower.includes(cleanQueryStr)) {
          score += 15; // exact match sequence bonus
        }
      }
    } else {
      score += 25;
    }

    // 5. Sentence endings / completeness bonus (5 points)
    const endsCorrectly = /[.!?؟]$/.test(response.trim());
    if (endsCorrectly) {
      score += 5;
    }

    // Penalize extremely short responses
    if (response.length < 50) {
      score *= 0.2;
    }

    // 6. Specialty multiplier
    let multiplier = 1.0;
    if (queryCategory === "coding" && result.agentType === "coder") {
      multiplier = 1.6;
    } else if (queryCategory === "coding" && result.agentType === "optimizer") {
      multiplier = 1.3;
    } else if (queryCategory === "security" && result.agentType === "security") {
      multiplier = 1.6;
    } else if (queryCategory === "security" && result.agentType === "skeptic") {
      multiplier = 1.3;
    } else if (queryCategory === "optimization" && result.agentType === "optimizer") {
      multiplier = 1.6;
    } else if (queryCategory === "ux" && result.agentType === "psychologist") {
      multiplier = 1.5;
    } else if (queryCategory === "ux" && result.agentType === "creative") {
      multiplier = 1.3;
    } else if (queryCategory === "research" && result.agentType === "researcher") {
      multiplier = 1.6;
    } else if (queryCategory === "creative" && result.agentType === "creative") {
      multiplier = 1.6;
    }

    score = score * multiplier;

    return {
      ...result,
      score: Math.min(Math.round(score), 100), // Cap at 100
    };
  });
}

// Build synthesis prompt using all 10 agents
function buildSynthesisPrompt(
  agentResults: Array<{ agentType: string; response: string; score?: number }>,
  originalQuery: string
): string {
  const agentMap: Record<string, string> = {
    architect: "Architecture & Strategy",
    coder: "Code Implementation",
    security: "Security Analysis",
    researcher: "Research & Facts",
    creative: "Creative Solutions",
    linguist: "Language & Tone",
    skeptic: "Critical Review",
    psychologist: "UX & Empathy",
    futurist: "Modern Practices",
    optimizer: "Performance",
  };
  
  const successfulResults = agentResults.filter(r => r.response && r.response.length > 10);
  
  return `Please analyze and synthesize the outputs from the following specialized cognitive agents to generate the ultimate, most comprehensive, and complete response to the user's query.

ORIGINAL QUERY: "${originalQuery}"

Here are the responses generated by the cognitive agents:

${successfulResults.map((agent) => `
### Agent: ${agentMap[agent.agentType] || agent.agentType.toUpperCase()}
${agent.response}
`).join("\n\n---\n\n")}

CRITICAL INSTRUCTIONS FOR SYNTHESIS:
1. DETECT the user's language and respond entirely in the SAME language (e.g., if the user asks in Arabic, respond in beautiful, fluent Arabic).
2. Synthesize the insights from ALL agents above into a single, cohesive, fully integrated response.
3. Organize the final response logically. If the user request relates to comparisons, specs, data lists, or tabular formats (or explicitly asks for "جدول" or "table"), you MUST construct a beautiful, detailed, and highly organized Markdown table conforming to the Google Docs standard:
   - Define clear, descriptive headers for every column.
   - Fill the table with complete, accurate, and comprehensive data (no placeholders like "...", "etc.").
   - Support bilingual formatting: if the text is Arabic, align the table logically for RTL rendering. Keep English technical terms in parentheses next to the Arabic translation if it aids clarity.
4. DO NOT mention agent names, rankings, or the fact that you received individual drafts in your final response. Write as a single, omniscient intelligence.
5. Do not summarize or omit important details from any agent. Make the final master response extremely detailed, exhaustive, and rich in depth (aim for a highly comprehensive, long-form output that is at least 2x more detailed than a standard response, preserving all technical arguments, code snippets, security considerations, and detailed logical reasoning provided by the individual agents).
6. ALWAYS append a clear, dedicated '### Sources / المصادر' section at the very end of your response listing the reference websites, papers, or documentation sources used for compiling the answer (including domain name and links in markdown format \`[Site Name](url)\`). Make sure these are real, high-quality reference websites (e.g., github.com, stackoverflow.com, MDN Web Docs, Wikipedia, and relevant official project pages).
7. You can highlight critical concepts, key terms, or major points dynamically. However, you must use highlights VERY SPARINGLY and INTELLIGENTLY:
   - Use at most ONE highlight per paragraph, and ONLY if that paragraph contains something truly important.
   - Renders:
     * [important::Text] -> Use for critical warnings, key focus areas, or core accomplishments (renders in a clean, low-glow violet tag).
     * [info::Text] -> Use for technical terms, data points, or general helpful notes (renders in a clean, subtle blue tag).
   - Do NOT use other highlight types. Standardize only on these two tags (\`important\` and \`info\`).
8. DO NOT use any raw emojis, pictograms, or icons in your final response under any circumstances. Emojis are strictly forbidden.

Generate the final synthesized master response now:`;
}

export const AGENT_CONFIGS_EXPORT = AGENT_CONFIGS;
