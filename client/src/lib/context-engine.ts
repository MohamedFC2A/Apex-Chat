import type { Conversation, Message } from "@shared/schema";

export interface MemoryContextItem {
  title: string;
  lastQuery: string;
  summary?: string;
  relevance: number;
  updatedAt?: number;
}

const MAX_HISTORY_MESSAGES = 14;
const MAX_MESSAGE_CHARS = 2600;
const MAX_HISTORY_CHARS = 18000;
const MAX_MEMORY_ITEMS = 6;

import { extractQuizTopic, isGenericTopic, detectQuizIntent } from "@shared/mcq";

function buildOlderMessagesSummary(olderMessages: Message[]): string {
  if (olderMessages.length === 0) return "";

  const summaryParts: string[] = [];

  // 1. Initial Goal/Topic
  const firstUserMessage = olderMessages.find(m => m.role === "user");
  if (firstUserMessage) {
    summaryParts.push(`* Initial user request: "${clipForContext(firstUserMessage.content, 120)}"`);
  }

  // 2. Extracted Topics
  const topics: string[] = [];
  olderMessages.forEach(m => {
    if (m.role === "user") {
      const topic = extractQuizTopic(m.content);
      if (topic && topic.length > 3 && !isGenericTopic(topic)) {
        topics.push(topic);
      }
    }
  });
  const uniqueTopics = Array.from(new Set(topics));
  if (uniqueTopics.length > 0) {
    summaryParts.push(`* Topics previously discussed: ${uniqueTopics.join(", ")}`);
  }

  // 3. Structured content indicators
  const quizCreated = olderMessages.some(m => m.role === "assistant" && m.content.includes("```mcq-quiz"));
  const pdfCreated = olderMessages.some(m => m.role === "assistant" && m.content.includes("```pdf-document"));
  const webCreated = olderMessages.some(m => m.role === "assistant" && (m.content.includes("```html") || m.content.includes("```css")));
  
  const assets: string[] = [];
  if (quizCreated) assets.push("Adaptive Quiz/Exam");
  if (pdfCreated) assets.push("Detailed PDF Document");
  if (webCreated) assets.push("Web Application UI Bundle");
  if (assets.length > 0) {
    summaryParts.push(`* Generated assets in early conversation: ${assets.join(", ")}`);
  }

  // 4. Compact Timeline of key questions
  const keyMilestones: string[] = [];
  olderMessages.forEach(m => {
    if (m.role === "user" && m.content.trim().length > 10 && !detectQuizIntent(m.content)) {
      keyMilestones.push(`User asked: "${clipForContext(m.content, 80)}"`);
    }
  });
  if (keyMilestones.length > 0) {
    const recentMilestones = keyMilestones.slice(-3);
    summaryParts.push(`* Key user queries:\n  - ${recentMilestones.join("\n  - ")}`);
  }

  return summaryParts.join("\n");
}

export function buildCompactConversationHistory(messages: Message[]): Array<{ role: "user" | "assistant"; content: string }> {
  if (!messages.length) return [];
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const compact: Array<{ role: "user" | "assistant"; content: string }> = [];
  let used = 0;

  for (let i = recent.length - 1; i >= 0; i--) {
    const item = recent[i];
    const sourceContent = item.contextContent || item.content;
    const clipped = clipForContext(sourceContent, MAX_MESSAGE_CHARS);
    if (used + clipped.length > MAX_HISTORY_CHARS && compact.length >= 4) break;
    compact.unshift({
      role: item.role,
      content: clipped,
    });
    used += clipped.length;
  }

  // Inject summary of truncated/older messages if history is long
  if (messages.length > MAX_HISTORY_MESSAGES) {
    const older = messages.slice(0, messages.length - MAX_HISTORY_MESSAGES);
    const summary = buildOlderMessagesSummary(older);
    if (summary) {
      compact.unshift({
        role: "assistant",
        content: `[System Memory Recall: Summary of the earlier parts of this conversation]\n${summary}`,
      });
    }
  }

  return compact;
}

export function buildRelevantMemoryContext(
  conversations: Conversation[],
  activeConversationId: string,
  currentMessage: string
): MemoryContextItem[] {
  const queryTerms = getTerms(currentMessage);
  return conversations
    .filter((conversation) => conversation.id !== activeConversationId && conversation.messages.length > 0)
    .map((conversation) => {
      const userMessages = conversation.messages.filter((message) => message.role === "user");
      const assistantMessages = conversation.messages.filter((message) => message.role === "assistant");
      const lastQuery = userMessages[userMessages.length - 1]?.content || "";
      const lastAnswer = assistantMessages[assistantMessages.length - 1]?.content || "";
      const summary = buildConversationSummary(conversation);
      const haystack = `${conversation.title} ${lastQuery} ${summary}`.toLowerCase();
      const relevance = queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0)
        + recencyBoost(conversation.updatedAt)
        + (lastAnswer ? 0.25 : 0);

      return {
        title: conversation.title,
        lastQuery: clipForContext(lastQuery, 900),
        summary,
        relevance,
        updatedAt: conversation.updatedAt,
      };
    })
    .filter((item) => item.relevance > 0.2 || currentMessage.trim().length < 12)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, MAX_MEMORY_ITEMS);
}

function buildConversationSummary(conversation: Conversation): string {
  const firstUser = conversation.messages.find((message) => message.role === "user")?.content || "";
  const lastPair = conversation.messages.slice(-4).map((message) => {
    const label = message.role === "user" ? "User" : "Assistant";
    return `${label}: ${clipForContext(message.contextContent || message.content, 450)}`;
  }).join("\n");

  return clipForContext(`Topic: ${conversation.title}\nFirst request: ${firstUser}\nRecent exchange:\n${lastPair}`, 1600);
}

function getTerms(value: string): string[] {
  return Array.from(new Set(String(value || "")
    .toLowerCase()
    .replace(/[^A-Za-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3)
    .slice(0, 40)));
}

function recencyBoost(updatedAt?: number): number {
  if (!updatedAt) return 0;
  const ageDays = Math.max(0, (Date.now() - updatedAt) / 86400000);
  if (ageDays < 1) return 1.5;
  if (ageDays < 7) return 1;
  if (ageDays < 30) return 0.5;
  return 0.1;
}

function clipForContext(text: string, maxChars: number): string {
  const clean = String(text || "").replace(/\s+\n/g, "\n").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars)}\n[... clipped for context control ...]`;
}
