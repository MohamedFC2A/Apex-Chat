import { z } from "zod";

// AI Model types
export const AIModels = ["gpt-4o", "claude-3.5-sonnet", "gemini-pro-1.5"] as const;
export type AIModel = typeof AIModels[number];

// Service modes
export const ServiceModes = ["standard", "dev", "education"] as const;
export type ServiceMode = typeof ServiceModes[number];

// Reasoning levels
export const ReasoningLevels = ["none", "thinking", "overthinking"] as const;
export type ReasoningLevel = typeof ReasoningLevels[number];

// Message role
export const MessageRoles = ["user", "assistant"] as const;
export type MessageRole = typeof MessageRoles[number];

// Chat message schema
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(MessageRoles),
  content: z.string(),
  model: z.enum(AIModels).optional(),
  reasoningContent: z.string().optional(),
  timestamp: z.number(),
});

export type Message = z.infer<typeof messageSchema>;

// Conversation schema
export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(messageSchema),
  model: z.enum(AIModels),
  mode: z.enum(ServiceModes),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Conversation = z.infer<typeof conversationSchema>;

// Chat request schema
export const chatRequestSchema = z.object({
  message: z.string().min(1),
  model: z.enum(AIModels),
  mode: z.enum(ServiceModes),
  reasoningLevel: z.enum(ReasoningLevels),
  conversationId: z.string().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Chat response schema
export const chatResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  reasoningContent: z.string().optional(),
  model: z.enum(AIModels),
  conversationId: z.string(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

// User preferences
export const userPreferencesSchema = z.object({
  defaultModel: z.enum(AIModels),
  defaultMode: z.enum(ServiceModes),
  defaultReasoning: z.enum(ReasoningLevels),
  theme: z.enum(["light", "dark"]),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Legacy user types for compatibility
export const users = {
  id: "",
  username: "",
  password: "",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
