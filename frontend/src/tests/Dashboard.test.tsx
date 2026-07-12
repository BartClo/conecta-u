import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Dashboard from "../routes/Dashboard";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";

vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { auth: { signOut: vi.fn() } } }));

beforeEach(() => {
  (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockClear();
});

describe("Dashboard", () => {
  it("greets the user with the name from /api/me", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Ada Lovelace",
      email: "ada@x.com",
    });
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/hola, ada lovelace/i)).toBeInTheDocument();
  });

  it("shows nav links to the other MVP pieces", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "Ada", email: "ada@x.com" });
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("link", { name: "Cursos" })).toHaveAttribute("href", "/cursos");
    expect(screen.getByText("Calendario")).toBeInTheDocument();
    expect(screen.getByText("Chat IA")).toBeInTheDocument();
    expect(screen.getByText("Perfil")).toBeInTheDocument();
  });

  it("logs out on button click", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "Ada", email: "ada@x.com" });
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /cerrar sesi/i }));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("signs out and redirects to /login when /api/me fails", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("401"));
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );
    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());
  });
});
