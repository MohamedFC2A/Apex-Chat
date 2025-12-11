import type { AIModel, ServiceMode, ReasoningLevel } from "@shared/schema";

// AI Orchestrator Service
// This service routes requests to the selected AI model with reasoning level simulation
// Follow blueprints for OpenAI, Anthropic, and Gemini integrations

interface OrchestratorRequest {
  message: string;
  model: AIModel;
  mode: ServiceMode;
  reasoningLevel: ReasoningLevel;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface OrchestratorResponse {
  content: string;
  reasoningContent?: string;
}

// System prompts for different service modes
const modeSystemPrompts: Record<ServiceMode, string> = {
  standard: `You are a helpful AI assistant. Provide clear, accurate, and helpful responses.`,
  dev: `You are an expert software developer and code assistant. When providing code:
- Always use proper syntax highlighting with \`\`\`language blocks
- Explain your code clearly
- Follow best practices and modern conventions
- Be precise with technical terminology`,
  education: `You are a patient and encouraging tutor. Your teaching style:
- Break down complex topics into simple steps
- Use the Socratic method - ask guiding questions
- Provide examples and analogies
- Encourage learning and celebrate progress`,
};

// Reasoning prompts
const reasoningPrompts: Record<ReasoningLevel, string> = {
  none: "",
  thinking: "Think through this step by step before answering.",
  overthinking: `Perform deep chain-of-thought analysis:
1. Consider multiple perspectives and approaches
2. Evaluate potential edge cases and pitfalls
3. Reason through the implications of different solutions
4. Synthesize your analysis into a comprehensive response`,
};

export async function processMessage(
  request: OrchestratorRequest
): Promise<OrchestratorResponse> {
  const { model, mode, reasoningLevel, message } = request;

  // Add delay for overthinking mode (simulates deep analysis)
  if (reasoningLevel === "overthinking") {
    await delay(3000);
  } else if (reasoningLevel === "thinking") {
    await delay(1500);
  } else {
    await delay(500);
  }

  // Check for API keys to determine if we use real AI or mock
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  // Route to appropriate provider if API key available
  try {
    if (model === "gpt-4o" && hasOpenAI) {
      return await callOpenAI(request);
    } else if (model === "claude-3.5-sonnet" && hasAnthropic) {
      return await callAnthropic(request);
    } else if (model === "gemini-pro-1.5" && hasGemini) {
      return await callGemini(request);
    }
  } catch (error) {
    console.error(`Error calling ${model}:`, error);
    // Fall through to mock response
  }

  // Mock response when no API keys or error
  return generateMockResponse(request);
}

async function callOpenAI(request: OrchestratorRequest): Promise<OrchestratorResponse> {
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = buildSystemPrompt(request.mode, request.reasoningLevel);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...(request.conversationHistory || []).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: request.message },
    ],
    max_completion_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content || "";
  
  if (request.reasoningLevel !== "none") {
    const parts = extractReasoningAndResponse(content);
    return parts;
  }

  return { content };
}

async function callAnthropic(request: OrchestratorRequest): Promise<OrchestratorResponse> {
  // claude-sonnet-4-20250514 is the newest Anthropic model
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = buildSystemPrompt(request.mode, request.reasoningLevel);
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      ...(request.conversationHistory || []).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: request.message },
    ],
  });

  const textBlock = response.content.find(block => block.type === "text");
  const content = textBlock && "text" in textBlock ? textBlock.text : "";

  if (request.reasoningLevel !== "none") {
    return extractReasoningAndResponse(content);
  }

  return { content };
}

async function callGemini(request: OrchestratorRequest): Promise<OrchestratorResponse> {
  // gemini-2.5-flash is the newest Gemini model
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const systemPrompt = buildSystemPrompt(request.mode, request.reasoningLevel);
  const fullPrompt = `${systemPrompt}\n\nUser: ${request.message}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  });

  const content = response.text || "";

  if (request.reasoningLevel !== "none") {
    return extractReasoningAndResponse(content);
  }

  return { content };
}

function buildSystemPrompt(mode: ServiceMode, reasoningLevel: ReasoningLevel): string {
  let prompt = modeSystemPrompts[mode];
  
  if (reasoningLevel !== "none") {
    prompt += `\n\n${reasoningPrompts[reasoningLevel]}`;
    if (reasoningLevel === "overthinking") {
      prompt += `\n\nFormat your response with reasoning first in <reasoning> tags, then your final response.`;
    }
  }

  return prompt;
}

function extractReasoningAndResponse(content: string): OrchestratorResponse {
  const reasoningMatch = content.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
  
  if (reasoningMatch) {
    const reasoningContent = reasoningMatch[1].trim();
    const responseContent = content.replace(/<reasoning>[\s\S]*?<\/reasoning>/, "").trim();
    return { content: responseContent, reasoningContent };
  }

  // If no tags, treat first third as reasoning for thinking mode
  const sentences = content.split(/(?<=[.!?])\s+/);
  const splitPoint = Math.floor(sentences.length / 3);
  
  if (splitPoint > 0) {
    return {
      reasoningContent: sentences.slice(0, splitPoint).join(" "),
      content: sentences.slice(splitPoint).join(" "),
    };
  }

  return { content };
}

function generateMockResponse(request: OrchestratorRequest): OrchestratorResponse {
  const { mode, reasoningLevel, message, model } = request;

  const modelResponses: Record<AIModel, Record<ServiceMode, string>> = {
    "gpt-4o": {
      standard: `I understand you're asking about: "${message.slice(0, 50)}..."\n\nAs GPT-4o, I'd be happy to help! This is a demonstration response. To get real AI responses, please configure your OpenAI API key.\n\nIn the meantime, feel free to explore the interface - try switching models, enabling thinking modes, or changing service contexts!`,
      dev: `\`\`\`typescript
// GPT-4o Code Assistant Demo
// Your query: ${message.slice(0, 30)}...

function exampleFunction() {
  // This is a mock response
  // Configure OPENAI_API_KEY for real code assistance
  console.log("Hello from ApexChat!");
  return true;
}

export default exampleFunction;
\`\`\`

This is a demonstration of the code mode. With a real API key, I can help you write, debug, and optimize code!`,
      education: `Great question! Let's explore "${message.slice(0, 30)}..." together.\n\n**Step 1: Understanding the Basics**\nFirst, let's make sure we understand the foundation...\n\n**Step 2: Building on What We Know**\nNow that we have the basics, we can explore further...\n\n**Your Turn!** What aspect would you like to dive deeper into?\n\n_(This is a demo response. Configure your API key for real tutoring!)_`,
    },
    "claude-3.5-sonnet": {
      standard: `Thank you for your message about "${message.slice(0, 50)}..."\n\nAs Claude 3.5 Sonnet, I aim to provide thoughtful and nuanced responses. This is currently a demonstration - configure your Anthropic API key to unlock my full capabilities!\n\nI'm designed to be helpful, harmless, and honest. Try out the different modes to see how I can assist you.`,
      dev: `\`\`\`python
# Claude 3.5 Sonnet - Code Assistant Demo
# Query: ${message.slice(0, 30)}...

def demonstrate_capability():
    """
    This is a mock response showcasing code formatting.
    Configure ANTHROPIC_API_KEY for real assistance.
    """
    features = [
        "Syntax highlighting",
        "Code explanation",
        "Bug detection",
        "Refactoring suggestions"
    ]
    return features

if __name__ == "__main__":
    print(demonstrate_capability())
\`\`\`

Claude is excellent at understanding complex codebases and providing detailed explanations. Enable the real API for full capabilities!`,
      education: `I'd love to help you learn about "${message.slice(0, 30)}..."!\n\n**Let me guide you with a question first:**\nWhat do you already know about this topic?\n\n**Here's a helpful framework:**\n1. Start with what you know\n2. Identify what's new\n3. Connect the dots\n\n**Think about it:** How might this apply to something you're already familiar with?\n\n_(Demo mode - add your API key for personalized tutoring!)_`,
    },
    "gemini-pro-1.5": {
      standard: `Regarding "${message.slice(0, 50)}...":\n\nAs Gemini Pro 1.5, I'm Google's advanced multimodal model. This is a demo response - enable your Gemini API key for full functionality!\n\nI can help with analysis, creative tasks, coding, and much more. The different service modes optimize my responses for your specific needs.`,
      dev: `\`\`\`javascript
// Gemini Pro 1.5 - Developer Mode Demo
// Your request: ${message.slice(0, 30)}...

const apexChatDemo = {
  model: "gemini-pro-1.5",
  capabilities: [
    "Code generation",
    "Documentation",
    "Testing suggestions",
    "Architecture advice"
  ],
  
  showCapabilities() {
    console.log("Configure GEMINI_API_KEY for full access!");
    return this.capabilities;
  }
};

export default apexChatDemo;
\`\`\`

Gemini excels at understanding context and generating clean, efficient code. Add your API key to unlock these capabilities!`,
      education: `Let's explore "${message.slice(0, 30)}..." step by step!\n\n**Understanding the Core Concept:**\nEvery topic has fundamental building blocks...\n\n**A Simple Analogy:**\nThink of it like building with blocks - each concept supports the next.\n\n**Reflection Questions:**\n- What patterns do you notice?\n- How does this connect to what you already know?\n\n**Next Steps:**\nWhat would you like to explore further?\n\n_(This is a demo. Enable your API key for interactive learning!)_`,
    },
  };

  const response = modelResponses[model][mode];

  if (reasoningLevel !== "none") {
    const reasoningContent =
      reasoningLevel === "overthinking"
        ? `Analyzing the query: "${message.slice(0, 50)}..."\n\n1. Breaking down the key components of this request\n2. Considering multiple approaches and perspectives\n3. Evaluating the best way to structure my response\n4. Synthesizing a comprehensive answer that addresses all aspects\n\nAfter deep analysis, I've formulated a thorough response that addresses the core question while considering edge cases and related concepts.`
        : `Thinking about: "${message.slice(0, 50)}..."\n\nLet me approach this systematically and provide a well-structured response.`;

    return { content: response, reasoningContent };
  }

  return { content: response };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
