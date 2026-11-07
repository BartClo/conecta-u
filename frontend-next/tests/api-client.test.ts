import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetchClient } from "../lib/api-client";
import { createBrowserSupabaseClient } from "../lib/supabase/client";

vi.mock("../lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

function mockSupabase(accessToken: string | null) {
  (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: accessToken ? { access_token: accessToken } : null },
      }),
    },
  });
}

describe("apiFetchClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000";
  });

  it("sends a Bearer token header when a session exists", async () => {
    mockSupabase("token-123");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "c1" }),
    });

    const result = await apiFetchClient<{ id: string }>("/api/cursos/c1");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/cursos/c1",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(result).toEqual({ id: "c1" });
  });

  it("returns undefined for a 204 response", async () => {
    mockSupabase("token-123");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiFetchClient("/api/cursos/c1", { method: "DELETE" });

    expect(result).toBeUndefined();
  });

  it("throws on a non-2xx response", async () => {
    mockSupabase("token-123");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(apiFetchClient("/api/cursos/no-existe")).rejects.toThrow(
      "404",
    );
  });
});
