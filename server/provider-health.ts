// provider-health.ts - فحص صحة وزمن استجابة المزودين
import type { ProviderConfig } from "./provider-registry";

export interface ProviderHealthStatus {
  name: string;
  displayName: string;
  configured: boolean;
  reachable: boolean;
  latencyMs: number | null;
  error: string | null;
  lastChecked: number;
}

// تخزين مؤقت لنتائج الفحص (5 دقائق)
const healthCache = new Map<string, { status: ProviderHealthStatus; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * يفحص صحة مزود محدد.
 * يرسل طلب بسيط لنقطة النهاية ويقيس زمن الاستجابة.
 * النتائج مخزنة مؤقتاً لتجنب rate limiting.
 */
export async function checkProviderHealth(
  config: ProviderConfig,
  apiKey: string
): Promise<ProviderHealthStatus> {
  // التحقق من التخزين المؤقت
  const cached = healthCache.get(config.name);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.status;
  }

  const result: ProviderHealthStatus = {
    name: config.name,
    displayName: config.displayName,
    configured: true,
    reachable: false,
    latencyMs: null,
    error: null,
    lastChecked: Date.now(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const startTime = Date.now();
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (config.headers) {
      Object.assign(headers, config.headers(apiKey));
    }

    const response = await fetch(`${config.baseURL}/models`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    result.latencyMs = Date.now() - startTime;
    result.reachable = response.ok;
    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (err: any) {
    result.error = err.name === "AbortError" ? "Timeout (5s)" : err.message;
  }

  healthCache.set(config.name, { status: result, timestamp: Date.now() });
  return result;
}

/**
 * يفحص صحة جميع المزودين المتاحين
 */
export async function checkAllProviders(
  providers: { config: ProviderConfig; apiKey: string }[]
): Promise<ProviderHealthStatus[]> {
  const results = await Promise.allSettled(
    providers.map(p => checkProviderHealth(p.config, p.apiKey))
  );
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      name: providers[i].config.name,
      displayName: providers[i].config.displayName,
      configured: true,
      reachable: false,
      latencyMs: null,
      error: "Health check failed internally",
      lastChecked: Date.now(),
    };
  });
}
