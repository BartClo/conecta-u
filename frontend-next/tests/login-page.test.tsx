import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "../app/(auth)/login/page";
import { createBrowserSupabaseClient } from "../lib/supabase/client";

vi.mock("../lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

describe("LoginPage", () => {
  it("starts Google OAuth sign-in on button click", async () => {
    const signInWithOAuth = vi
      .fn()
      .mockResolvedValue({ data: {}, error: null });
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signInWithOAuth },
    });

    render(<LoginPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /continuar con google/i }),
    );

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
  });
});
