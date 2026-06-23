import type { AIModel } from "@shared/schema";
import { Zap, Sparkles, Brain, Crown, Cpu, Code2, Skull, Search } from "lucide-react";

// BRAND MASKING: Premium model names mapped to real Cerebras/Groq APIs
// Users see next-gen branding, backend routes to actual models
export const MODELS: AIModel[] = [
  "apex-flash",
  "apex-pro",
  "apex-elite",
  "apex-omni",
  "apex-unbound",
];

export const MODEL_TIER_MAP: Record<AIModel, "starter" | "pro" | "elite" | "omni"> = {
  "apex-flash": "starter",
  "apex-pro": "pro",
  "apex-elite": "elite",
  "apex-omni": "omni",
  "apex-unbound": "omni",
};

export const MODEL_INFO: Record<AIModel, { name: string; subtitle: string; icon: typeof Zap }> = {
  "apex-flash": { 
    name: "APEX Flash", 
    subtitle: "Lightning Fast & Efficient", 
    icon: Zap 
  },
  "apex-pro": { 
    name: "APEX Pro", 
    subtitle: "Advanced Logic & Coding", 
    icon: Cpu 
  },
  "apex-elite": { 
    name: "Apex search", 
    subtitle: "Real-time Web Search & AI", 
    icon: Search 
  },
  "apex-omni": { 
    name: "APEX Singularity", 
    subtitle: "[DECA-CORE] Cognitive Engine", 
    icon: Crown 
  },
  "apex-unbound": {
    name: "APEX Unbound",
    subtitle: "DeepSeek Pro · Code Architect",
    icon: Code2
  },
};

export const TIER_ORDER = { starter: 0, pro: 1, elite: 2, omni: 3 } as const;
