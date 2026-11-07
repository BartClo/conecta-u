import { cookies } from "next/headers";
import { TEST_COOKIE } from "./auth/test-session";
import { createServerSupabaseClient } from "./supabase/server";

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

async function authHeaders(): Promise<Record<string, string>> {
  let token: string | null | undefined;
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "test") {
    token = (await cookies()).get(TEST_COOKIE)?.value;
  } else {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token;
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Dentro de Docker el servidor no alcanza el API por la URL publica del navegador.
function apiUrl(path: string): string {
  return `${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL}${path}`;
}

export async function apiFetchServer<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers = await authHeaders();
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(apiUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Like apiFetchServer but never throws on HTTP errors: callers branch on `status`. */
export async function apiFetchServerSafe<T>(
  path: string,
): Promise<{ status: number; data: T | null }> {
  const response = await fetch(apiUrl(path), {
    headers: await authHeaders(),
    cache: "no-store",
  });

  return {
    status: response.status,
    data: response.ok ? ((await response.json()) as T) : null,
  };
}
