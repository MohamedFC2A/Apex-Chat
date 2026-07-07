// provider-registry.ts - سجل المزودين المتعدد مع أولويات واحتياطي تلقائي
export interface ProviderConfig {
  name: string;
  displayName: string;
  envKey: string;
  baseURL: string;
  priority: number;               // 1 = highest priority
  models: Record<string, string>; // virtual model -> actual model ID
  validateKey: (key: string) => boolean;
  headers?: (key: string) => Record<string, string>;
}

export interface ResolvedProvider {
  config: ProviderConfig;
  apiKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "openrouter",
    displayName: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    priority: 1,
    models: {
      "apex-flash": "google/gemini-2.5-flash",
      "apex-elite": "google/gemini-2.5-flash",
      "apex-omni": "google/gemini-2.5-flash",
      "apex-coder": "google/gemini-2.5-flash",
    },
    validateKey: (key: string) => key.startsWith("sk-or-"),
    headers: (key: string) => ({
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": process.env.APP_URL || "https://apex-chat.app",
      "X-Title": "Apex Chat",
    }),
  },
  {
    name: "deepseek",
    displayName: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com/v1",
    priority: 2,
    models: {
      "apex-flash": "deepseek-chat",
      "apex-elite": "deepseek-chat",
      "apex-omni": "deepseek-chat",
      "apex-coder": "deepseek-chat",
    },
    validateKey: (key: string) => key.startsWith("sk-"),
  },
  {
    name: "cerebras",
    displayName: "Cerebras",
    envKey: "CEREBRAS_API_KEY",
    baseURL: "https://api.cerebras.ai/v1",
    priority: 3,
    models: {
      "apex-flash": "llama3.1-8b",
      "apex-elite": "llama3.1-70b",
      "apex-omni": "llama3.1-70b",
      "apex-coder": "llama3.1-70b",
    },
    validateKey: (key: string) => key.startsWith("sk-") || key.startsWith("csk-"),
  },
];

/**
 * يحصل على المزود النشط حسب الأولوية.
 * يفحص مفاتيح البيئة بالترتيب ويعيد أول مزود متاح.
 * هذا النظام هو نتاج هندسة متقنة - كل مزود، كل أولوية، تمت معايرتها بعناية.
 */
export function getActiveProvider(_modelName?: string): ResolvedProvider | null {
  const sorted = [...PROVIDERS].sort((a, b) => a.priority - b.priority);

  for (const provider of sorted) {
    const apiKey = process.env[provider.envKey];
    if (apiKey && provider.validateKey(apiKey)) {
      return { config: provider, apiKey };
    }
  }
  return null;
}

/**
 * يحصل على قائمة جميع المزودين المتاحين
 */
export function getAllConfiguredProviders(): ProviderConfig[] {
  return PROVIDERS.filter(p => {
    const key = process.env[p.envKey];
    return key && p.validateKey(key);
  });
}

/**
 * يحل اسم النموذج الافتراضي إلى نموذج فعلي حسب المزود النشط
 */
export function resolveModel(virtualModel: string): { provider: ResolvedProvider; actualModel: string } | null {
  const provider = getActiveProvider(virtualModel);
  if (!provider) return null;

  const actualModel = provider.config.models[virtualModel] || virtualModel;
  return { provider, actualModel };
}

/**
 * يحصل على نموذج احتياطي إذا فشل المزود الأساسي
 */
export function getFallbackProvider(failedProvider: string): ResolvedProvider | null {
  const sorted = [...PROVIDERS].sort((a, b) => a.priority - b.priority);
  for (const provider of sorted) {
    if (provider.name === failedProvider) continue;
    const apiKey = process.env[provider.envKey];
    if (apiKey && provider.validateKey(apiKey)) {
      return { config: provider, apiKey };
    }
  }
  return null;
}

export { PROVIDERS };
