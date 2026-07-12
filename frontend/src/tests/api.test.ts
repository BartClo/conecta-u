import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

beforeEach(() => {
  (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { session: { access_token: "t" } },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }),
  );
});

describe("apiFetch", () => {
  it("defaults to GET with no body", async () => {
    await apiFetch("/api/x");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("sends method and JSON body when provided", async () => {
    await apiFetch("/api/x", { method: "POST", body: { a: 1 } });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for 204 responses", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204 });
    const result = await apiFetch("/api/x", { method: "DELETE" });
    expect(result).toBeUndefined();
  });
});
