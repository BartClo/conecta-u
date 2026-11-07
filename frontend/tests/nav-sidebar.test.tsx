import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavSidebar } from "../components/nav-sidebar";
import { createBrowserSupabaseClient } from "../lib/supabase/client";

vi.mock("../lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("NavSidebar", () => {
  it("shows links to Cursos and Calendario, and placeholders for the rest", () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut: vi.fn() },
    });

    render(<NavSidebar userName="Ada" userEmail="ada@x.com" />);

    expect(screen.getByRole("link", { name: "Cursos" })).toHaveAttribute(
      "href",
      "/cursos",
    );
    expect(screen.getByRole("link", { name: "Calendario" })).toHaveAttribute(
      "href",
      "/calendario",
    );
    expect(screen.getByText("Chat IA")).toBeInTheDocument();
    expect(screen.getByText(/ada/i)).toBeInTheDocument();
  });

  it("falls back to the email when there is no userName", () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut: vi.fn() },
    });

    render(<NavSidebar userName={null} userEmail="ada@x.com" />);

    expect(screen.getByText("ada@x.com")).toBeInTheDocument();
  });

  it("signs out on button click", () => {
    const signOut = vi.fn();
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut },
    });

    render(<NavSidebar userName="Ada" userEmail="ada@x.com" />);
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesi/i }));

    expect(signOut).toHaveBeenCalled();
  });
});
