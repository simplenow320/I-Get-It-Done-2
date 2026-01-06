import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getStoredAuthToken } from "@/contexts/AuthContext";

export function getApiUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:5000`;
  }

  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  
  if (apiUrl) {
    return apiUrl;
  }

  const host = process.env.EXPO_PUBLIC_DOMAIN;
  
  if (host) {
    const hostWithoutPort = host.split(":")[0];
    return `https://${hostWithoutPort}`;
  }

  return "https://igetitdone.co";
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getStoredAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const authHeaders = await getAuthHeaders();

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);
    const authHeaders = await getAuthHeaders();

    const res = await fetch(url, {
      credentials: "include",
      headers: authHeaders,
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
