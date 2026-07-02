// Hybrid API Configuration - DeepSeek Infrastructure
// Provides model mappings for the APEX AI models

export interface APIProvider {
  name: "deepseek";
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

  // DeepSeek (Primary Provider)
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY || "";
  if (deepseekKey) {
    providers.push({
      name: "deepseek",
      baseURL: "https://api.deepseek.com/v1",
      apiKey: deepseekKey,
      models: {
        "apex-flash": "deepseek-v4-flash",
        "apex-pro": "deepseek-v4-pro",
        "apex-elite": "deepseek-v4-pro",
        "apex-omni": "deepseek-v4-flash",
        "apex-unbound": "deepseek-v4-pro",
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
