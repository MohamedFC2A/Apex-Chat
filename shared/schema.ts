import { z } from "zod";

// AI Model types - DeepSeek Cloud Models
export const AIModels = [
  "apex-flash",
  "apex-pro",
  "apex-elite",
  "apex-omni",
  "apex-unbound"
] as const;
export type AIModel = typeof AIModels[number];

// Subscription Tiers
export const SubscriptionTiers = ["starter", "pro", "elite", "omni"] as const;
export type SubscriptionTier = typeof SubscriptionTiers[number];

// Model to Tier Mapping
export const ModelTierMap: Record<AIModel, SubscriptionTier> = {
  "apex-flash": "starter",
  "apex-pro": "pro",
  "apex-elite": "elite",
  "apex-omni": "omni",
  "apex-unbound": "omni",
};

// Voucher Codes (Direct Tier Unlock)
export const VoucherCodes = {
  STARTER_2025: "starter",
  DEEP_PRO_X: "pro",
  CHAOS_THEORY_100: "elite",
  OMNI_GENESIS_MAX: "omni", // Tier 4 - Apex Omni
} as const;

// Credit-Based Voucher Codes (Wallet Top-Up)
export const CreditVoucherCodes: Record<string, number> = {
  "2008": 150, // $150 Credit
} as const;

// Multi-Use Voucher System Types
export type VoucherStatus = 'active' | 'exhausted';

export interface Voucher {
  code: string;           // Unique voucher code (e.g., "1977")
  amount: number;         // Credit amount to award (e.g., 200)
  maxUses: number;        // Maximum redemptions allowed (e.g., 5)
  usedBy: string[];       // Array of User UIDs who have claimed this voucher
  status: VoucherStatus;  // 'active' when available, 'exhausted' when maxUses reached
  createdAt?: string;     // ISO timestamp of creation
  description?: string;   // Optional voucher description
}

// Firestore Cloud Chat Types
export interface CloudConversation extends Conversation {
  userId: string;         // Owner's UID
  syncedAt: string;       // Last sync timestamp
  isDeleted?: boolean;    // Soft delete flag
}

// Plan Prices (for wallet purchases)
export const PlanPrices: Record<SubscriptionTier, number> = {
  starter: 0,
  pro: 29,
  elite: 79,
  omni: 149,
} as const;

// Wallet System Types
export interface UserWallet {
  balance: number;
  currency: string;
}

export interface UserSubscription {
  active: boolean;
  startDate: string; // ISO String
  expiresAt: string; // ISO String
  autoRenew: boolean;
}

export type TransactionType = 'CREDIT_REDEEM' | 'PLAN_PURCHASE';

export interface TransactionHistoryItem {
  id: string;
  date: string; // ISO String
  type: TransactionType;
  amount: number; // Positive for credit, Negative for purchase
  description: string;
}

// Service modes
export const ServiceModes = ["standard", "dev", "education"] as const;
export type ServiceMode = typeof ServiceModes[number];

// Reasoning levels
export const ReasoningLevels = ["none", "thinking", "overthinking"] as const;
export type ReasoningLevel = typeof ReasoningLevels[number];

// Feature Toggles
export interface FeatureToggles {
  thinking: boolean;
  deepResearch: boolean;
  godMode: boolean;
}

// Message role
export const MessageRoles = ["user", "assistant"] as const;
export type MessageRole = typeof MessageRoles[number];

// Chat message schema
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(MessageRoles),
  content: z.string(),
  contextContent: z.string().optional(),
  model: z.enum(AIModels).optional(),
  reasoningContent: z.string().optional(),
  timestamp: z.number(),
  omniState: z.any().optional(),
  tokens: z.number().optional(),
  reasoningTokens: z.number().optional(),
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
  subscriptionTier: z.enum(SubscriptionTiers),
  features: z.object({
    thinking: z.boolean(),
    deepResearch: z.boolean(),
    godMode: z.boolean(),
  }),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
  userMemoryContext: z.array(z.object({
    title: z.string(),
    lastQuery: z.string(),
    summary: z.string().optional(),
    relevance: z.number().optional(),
    updatedAt: z.number().optional(),
  })).optional(),
  clientLocalTime: z.string().optional(),
  stream: z.boolean().optional(),
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
  subscriptionTier: z.enum(SubscriptionTiers),
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

// Mixed Arabic-English token estimator
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  let arabicCharCount = 0;
  let englishCharCount = 0;
  
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Arabic unicode range
    if (code >= 0x0600 && code <= 0x06FF) {
      arabicCharCount++;
    } else {
      englishCharCount++;
    }
  }
  
  // Arabic: ~2.0 characters per token
  // English: ~4.0 characters per token
  const arabicTokens = Math.ceil(arabicCharCount / 2.0);
  const englishTokens = Math.ceil(englishCharCount / 4.0);
  
  return arabicTokens + englishTokens;
}

// Get context window limit by model name
export function getModelContextLimit(model: string): number {
  if (!model) return 1048576;
  if (model === "apex-flash" || model === "apex-pro" || model === "apex-elite" || model === "apex-omni" || model === "apex-unbound") {
    return 1048576; // google/gemini-2.5-flash limit is 1,048,576
  }
  if (model.includes("llama-3.3") || model.includes("llama-3.2")) return 131072;
  if (model.includes("gemini-2.5") || model.includes("qwen-2.5-coder") || model.includes("qwen3")) return 1048576;
  if (model.includes("ling-2.6")) return 262144;
  return 1048576;
}
