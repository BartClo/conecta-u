import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Login from "../routes/Login";
import { supabase } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { signInWithOAuth: vi.fn() } },
}));

describe("Login", () => {
  it("triggers google oauth on click", async () => {
    (supabase.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    render(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));

    await waitFor(() =>
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google" }),
    );
  });

  it("shows an error message when oauth fails", async () => {
    (supabase.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: { message: "oauth failed" },
    });
    render(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));

    expect(await screen.findByText(/oauth failed/i)).toBeInTheDocument();
  });
});
