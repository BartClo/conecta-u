import { supabase } from "./supabase";

export async function apiFetch<T>(path: string): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
