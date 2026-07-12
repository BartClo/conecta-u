import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProtectedRoute from "../routes/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

let authStateCallback: ((event: string, session: unknown) => void) | undefined;

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renders protected content when a session exists", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { access_token: "t" } },
    });
    renderWithRoute();
    expect(await screen.findByText("Dashboard content")).toBeInTheDocument();
  });

  it("redirects to /login when there is no session", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    });
    renderWithRoute();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("updates session when onAuthStateChange fires", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    act(() => {
      authStateCallback?.("SIGNED_IN", { access_token: "t" });
    });

    expect(result.current.session).toEqual({ access_token: "t" });
  });
});
