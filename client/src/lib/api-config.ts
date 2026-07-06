// Hybrid API Configuration - OpenRouter Infrastructure
// Provides model mappings for the APEX AI models

export interface APIProvider {
  name: "openrouter";
  baseURL: string;
  apiKey: string;
  models: Record<string, string>; // Virtual model -> Actual model mapping
  priority: number; // Lower = higher priority
  available: boolean;
}

export interface APIConfig {
  providers: APIProvider[];
  fallbackEnabled: boolean;
  loadBalancing: "priority" | "round-robin" | "hybrid";
}

/**
 * Get API providers configuration from environment
 */
export function getAPIProviders(): APIProvider[] {
  const providers: APIProvider[] = [];

  // OpenRouter (Primary Provider)
  const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_DEEPSEEK_API_KEY || "";
  if (openrouterKey) {
    providers.push({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openrouterKey,
      models: {
        "apex-flash": "poolside/laguna-xs-2.1:free",
        "apex-pro": "nvidia/nemotron-3-super-120b-a12b:free",
        "apex-elite": "nvidia/nemotron-3-super-120b-a12b:free",
        "apex-omni": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "apex-unbound": "nvidia/nemotron-3-ultra-550b-a55b:free",
      },
      priority: 1,
      available: true,
    });
  }

  return providers;
}

/**
 * Get the best provider for a given agent index
 */
export function getProviderForAgent(
  agentIndex: number,
  totalAgents: number,
  providers: APIProvider[]
): APIProvider | null {
  if (providers.length === 0) return null;
  return providers[0];
}

/**
 * Get fallback provider when primary fails
 */
export function getFallbackProvider(
  primaryProvider: APIProvider,
  providers: APIProvider[]
): APIProvider | null {
  return null;
}

/**
 * Map virtual model to actual model for a provider
 */
export function mapModelForProvider(
  virtualModel: string,
  provider: APIProvider
): string {
  return provider.models[virtualModel] || virtualModel;
}

/**
 * Check if any provider is available
 */
export function hasAvailableProvider(): boolean {
  const providers = getAPIProviders();
  return providers.length > 0;
}

/**
 * Get API configuration
 */
export function getAPIConfig(): APIConfig {
  return {
    providers: getAPIProviders(),
    fallbackEnabled: false,
    loadBalancing: "priority",
  };
}
