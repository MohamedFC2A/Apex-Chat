import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 403 Forbidden (tier access denied)
  if (res.status === 403) {
    try {
      const payload = await res.json();
      return ({ error: payload?.error || "Upgrade Required", message: payload?.message } as unknown) as T;
    } catch {
      return ({ error: "Upgrade Required" } as unknown) as T;
    }
  }

  // Handle 503 Service Unavailable (AI service connection failure)
  if (res.status === 503) {
    try {
      const payload = await res.json();
      return ({ 
        error: payload?.error || "Service Unavailable", 
        message: payload?.message || "Local AI service is not responding.",
        details: payload?.details,
        troubleshooting: payload?.troubleshooting
      } as unknown) as T;
    } catch {
      return ({ error: "Service Unavailable", message: "Local AI service is not responding." } as unknown) as T;
    }
  }

  // Handle other 5xx server errors
  if (res.status >= 500) {
    try {
      const payload = await res.json();
      return ({ 
        error: payload?.error || "Server Error", 
        message: payload?.message || "An unexpected server error occurred."
      } as unknown) as T;
    } catch {
      return ({ error: "Server Error", message: res.statusText } as unknown) as T;
    }
  }

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
