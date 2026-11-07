import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetchClient } from "../lib/api-client";
import { NavSidebar } from "../components/nav-sidebar";
import { createBrowserSupabaseClient } from "../lib/supabase/client";

vi.mock("../lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));
vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderNav(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  (apiFetchClient as ReturnType<typeof vi.fn>).mockReset();
  (apiFetchClient as ReturnType<typeof vi.fn>).mockResolvedValue({ saldo: 80 });
});

describe("NavSidebar", () => {
  it("shows links to Cursos, Calendario and Grupos, and placeholders for the rest", () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut: vi.fn() },
    });

    renderNav(<NavSidebar userName="Ada" userEmail="ada@x.com" />);

    expect(screen.getByRole("link", { name: "Cursos" })).toHaveAttribute(
      "href",
      "/cursos",
    );
    expect(screen.getByRole("link", { name: "Ranking" })).toHaveAttribute(
      "href",
      "/ranking",
    );
    expect(screen.getByRole("link", { name: "Calendario" })).toHaveAttribute(
      "href",
      "/calendario",
    );
    expect(screen.getByRole("link", { name: "Grupos" })).toHaveAttribute(
      "href",
      "/grupos",
    );
    expect(screen.getByRole("link", { name: "Asistente IA" })).toHaveAttribute(
      "href",
      "/ia/resumenes",
    );
    expect(screen.queryByText("Chat IA")).not.toBeInTheDocument();
    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getByText(/ada/i)).toBeInTheDocument();
  });

  it("falls back to the email when there is no userName", () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut: vi.fn() },
    });

    renderNav(<NavSidebar userName={null} userEmail="ada@x.com" />);

    expect(screen.getByText("ada@x.com")).toBeInTheDocument();
  });

  it("signs out on button click", () => {
    const signOut = vi.fn();
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut },
    });

    renderNav(<NavSidebar userName="Ada" userEmail="ada@x.com" />);
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesi/i }));

    expect(signOut).toHaveBeenCalled();
  });

  it("links to Creditos and shows a skeleton, then the saldo", async () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut: vi.fn() },
    });

    renderNav(<NavSidebar userName="Ada" userEmail="ada@x.com" />);

    expect(screen.getByRole("link", { name: "Créditos" })).toHaveAttribute(
      "href",
      "/creditos",
    );
    expect(screen.getByTestId("saldo-skeleton")).toBeInTheDocument();
    expect(await screen.findByText("80")).toBeInTheDocument();
    expect(apiFetchClient).toHaveBeenCalledWith("/api/creditos/saldo");
  });

  it("omits the saldo without breaking the nav when the query fails", async () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut: vi.fn() },
    });
    (apiFetchClient as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API request failed: 500"),
    );

    renderNav(<NavSidebar userName="Ada" userEmail="ada@x.com" />);

    await waitFor(() =>
      expect(screen.queryByTestId("saldo-skeleton")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Créditos" })).toBeInTheDocument();
  });
});
