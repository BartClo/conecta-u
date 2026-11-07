import { readTestToken } from "./auth/test-session";
import { createBrowserSupabaseClient } from "./supabase/client";

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

async function accessToken(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "test") return readTestToken();
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiFetchClient<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const token = await accessToken();
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`,
    {
      method: options.method ?? "GET",
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    },
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
