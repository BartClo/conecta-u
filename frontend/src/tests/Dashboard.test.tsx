import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "../routes/Dashboard";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";

vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { auth: { signOut: vi.fn() } } }));

describe("Dashboard", () => {
  it("greets the user with the name from /api/me", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Ada Lovelace",
      email: "ada@x.com",
    });
    render(<Dashboard />);
    expect(await screen.findByText(/hola, ada lovelace/i)).toBeInTheDocument();
  });

  it("shows nav links to the other MVP pieces", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "Ada", email: "ada@x.com" });
    render(<Dashboard />);
    expect(await screen.findByText("Cursos")).toBeInTheDocument();
    expect(screen.getByText("Calendario")).toBeInTheDocument();
    expect(screen.getByText("Chat IA")).toBeInTheDocument();
    expect(screen.getByText("Perfil")).toBeInTheDocument();
  });

  it("logs out on button click", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "Ada", email: "ada@x.com" });
    render(<Dashboard />);
    fireEvent.click(await screen.findByRole("button", { name: /cerrar sesi/i }));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
