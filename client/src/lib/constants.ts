import type { AIModel } from "@shared/schema";
import { Zap, Sparkles, Brain, Crown, Cpu, Code2, Skull, Search } from "lucide-react";

// BRAND MASKING: Premium model names mapped to real Cerebras/Groq APIs
// Users see next-gen branding, backend routes to actual models
// NOTE: apex-pro REMOVED. apex-unbound RENAMED to apex-coder (now consolidated).
export const MODELS: AIModel[] = [
  "apex-flash",
  "apex-elite",
  "apex-omni",
  "apex-coder",
];

export const MODEL_TIER_MAP: Record<AIModel, "starter" | "pro" | "elite" | "omni"> = {
  "apex-flash": "starter",
  "apex-elite": "elite",
  "apex-omni": "omni",
  "apex-coder": "omni",
};

export const MODEL_INFO: Record<AIModel, { name: string; subtitle: string; icon: typeof Zap }> = {
  "apex-flash": { 
    name: "APEX Flash", 
    subtitle: "Lightning Fast & Efficient", 
    icon: Zap 
  },
  "apex-elite": { 
    name: "Apex Search", 
    subtitle: "Real-time Web Search & AI", 
    icon: Search 
  },
  "apex-omni": { 
    name: "Apex Omni", 
    subtitle: "[DODECA-CORE] Neuro-Synaptic Engine · AGI-Grade Reasoning", 
    icon: Crown 
  },
  "apex-coder": {
    name: "Apex Coder",
    subtitle: "Autonomous Full-Stack Architect · Code & Deploy",
    icon: Code2
  },
};

export const TIER_ORDER = { starter: 0, pro: 1, elite: 2, omni: 3 } as const;
