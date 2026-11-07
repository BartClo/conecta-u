import { createServerSupabaseClient } from "./supabase/server";

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetchServer<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = session
    ? { Authorization: `Bearer ${session.access_token}` }
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
      cache: "no-store",
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

/** Like apiFetchServer but never throws on HTTP errors: callers branch on `status`. */
export async function apiFetchServerSafe<T>(
  path: string,
): Promise<{ status: number; data: T | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`,
    {
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
      cache: "no-store",
    },
  );

  return {
    status: response.status,
    data: response.ok ? ((await response.json()) as T) : null,
  };
}
