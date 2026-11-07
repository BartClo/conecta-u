import { createBrowserSupabaseClient } from "./supabase/client";

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

export async function apiFetchClient<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const supabase = createBrowserSupabaseClient();
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
