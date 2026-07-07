export async function runDiagnostics() {
  // Use styling for console messages to make them look ultra premium
  const isDev = import.meta.env.DEV;
  console.log(
    `%c⚡ APEX CHAT SYSTEM DIAGNOSTICS %c${isDev ? "DEVELOPMENT" : "PRODUCTION"}`,
    "background: linear-gradient(135deg, #cf9f3d 0%, #8b5cf6 100%); color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 11px;",
    "background: #111; color: #a855f7; padding: 4px 6px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 11px; margin-left: 6px;"
  );

  // 1. Check Browser Capabilities
  const features = {
    webSockets: typeof WebSocket !== "undefined",
    localStorage: typeof localStorage !== "undefined",
    sessionStorage: typeof sessionStorage !== "undefined",
    serviceWorker: "serviceWorker" in navigator,
  };

  console.log(
    `%c⚙️ BROWSER RUNTIME CHECK%c\n• WebSockets:      ${features.webSockets ? "🟢 SUPPORTED" : "🔴 UNSUPPORTED"}\n• LocalStorage:    ${features.localStorage ? "🟢 SUPPORTED" : "🔴 UNSUPPORTED"}\n• SessionStorage:  ${features.sessionStorage ? "🟢 SUPPORTED" : "🔴 UNSUPPORTED"}\n• ServiceWorker:   ${features.serviceWorker ? "🟢 SUPPORTED" : "🟡 NOT REGISTERED"}`,
    "font-weight: bold; color: #8b5cf6; font-family: monospace; font-size: 11px;",
    "color: #b4b6b9; font-family: monospace; font-size: 11px; line-height: 1.5;"
  );

  // 2. Check Backend & Provider Configuration
  try {
    const startTime = performance.now();
    const res = await fetch("/api/health");
    const endTime = performance.now();
    const latency = (endTime - startTime).toFixed(1);

    if (res.ok) {
      const data = await res.json();
      const statusColor = data.status === "ok" ? "🟢 OK" : "🔴 DEGRADED";
      const statusTextColor = data.status === "ok" ? "color: #10b981;" : "color: #ef4444;";

      // Defensive: provider may be null/undefined if no keys configured
      const provider = data?.provider || null;
      const apiConfigured = data?.apiConfigured === true;
      const configuredProviders = data?.configuredProviders || [];
      const providerDisplay = provider ? provider.toUpperCase() : "UNKNOWN";
      const providerDetail = configuredProviders.length > 1
        ? ` (${configuredProviders.join(", ")})`
        : "";
      const apiStatusColor = apiConfigured ? "color: #10b981; font-weight: bold;" : "color: #ef4444; font-weight: bold;";
      const apiStatusText = apiConfigured
        ? `🟢 ACTIVE${providerDetail}`
        : "🔴 MISSING API KEYS";
      const providerColor = provider ? "color: #d946ef; font-weight: bold;" : "color: #ef4444; font-weight: bold;";

      console.log(
        `%c🌐 BACKEND SERVICE STATUS%c\n• Connection:      %c${statusColor}%c\n• Network Latency: %c${latency}ms%c\n• Active Provider: %c${providerDisplay}${providerDetail}%c\n• API Integration: %c${apiStatusText}`,
        "font-weight: bold; color: #3b82f6; font-family: monospace; font-size: 11px;",
        "color: #b4b6b9; font-family: monospace; font-size: 11px; line-height: 1.5;",
        statusTextColor + " font-weight: bold;", "color: #b4b6b9;",
        "color: #10b981; font-weight: bold;", "color: #b4b6b9;",
        providerColor, "color: #b4b6b9;",
        apiStatusColor
      );

      if (!apiConfigured) {
        console.warn(
          "%c⚠️ ATTENTION Required: The backend is running but reported that no active API key is set for OpenRouter or DeepSeek. Please configure OPENROUTER_API_KEY or DEEPSEEK_API_KEY in Vercel settings or your .env.local file.",
          "color: #fbbf24; font-weight: bold; font-family: monospace; font-size: 11px;"
        );
      }
    } else {
      console.error(
        `%c🔴 BACKEND STATUS ERROR%c\n• HTTP Server returned status: ${res.status}`,
        "font-weight: bold; color: #ef4444; font-family: monospace; font-size: 11px;",
        "color: #ef4444; font-family: monospace; font-size: 11px;"
      );
    }
  } catch (err: any) {
    console.error(
      `%c🔴 NETWORK CONNECTION FAILED%c\n• Target: /api/health\n• Reason: ${err?.message || err}`,
      "font-weight: bold; color: #ef4444; font-family: monospace; font-size: 11px;",
      "color: #ef4444; font-family: monospace; font-size: 11px; line-height: 1.5;"
    );
  }
}
