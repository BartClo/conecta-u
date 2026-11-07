import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DesafioPage from "../app/(app)/grupos/[id]/desafios/[desafioId]/page";
import { apiFetchServer, apiFetchServerSafe } from "../lib/api-server";

vi.mock("../lib/api-server", () => ({
  apiFetchServer: vi.fn(),
  apiFetchServerSafe: vi.fn(),
}));
vi.mock(
  "../app/(app)/grupos/[id]/desafios/[desafioId]/resultado-client",
  () => ({
    ResultadoClient: ({ children }: { children?: React.ReactNode }) => (
      <div>
        RESULTADO
        {children}
      </div>
    ),
  }),
);
vi.mock("../components/desafios/desafio-ranking", () => ({
  DesafioRanking: ({ userId }: { userId: string }) => (
    <div>RANKING {userId}</div>
  ),
}));
vi.mock("../app/(app)/grupos/[id]/desafios/[desafioId]/rendir-client", () => ({
  RendirClient: () => <div>RENDIR</div>,
}));
const safe = apiFetchServerSafe as ReturnType<typeof vi.fn>;
const server = apiFetchServer as ReturnType<typeof vi.fn>;

async function pagina() {
  const ui = await DesafioPage({
    params: Promise.resolve({ id: "g1", desafioId: "d1" }),
  });
  render(ui);
}

beforeEach(() => {
  safe.mockReset();
  server.mockReset();
  server.mockImplementation(async (path: string) =>
    path === "/api/me" ? { id: "yo" } : [],
  );
});

describe("DesafioPage state resolution", () => {
  it("200 on intentos/me mounts the result", async () => {
    safe
      .mockResolvedValueOnce({ status: 200, data: { id: "i1" } })
      .mockResolvedValueOnce({ status: 200, data: { id: "d1" } });
    await pagina();
    expect(screen.getByText(/RESULTADO/)).toBeInTheDocument();
    expect(screen.getByText("RANKING yo")).toBeInTheDocument();
    expect(safe.mock.calls[1][0]).toBe("/api/desafios/d1");
    expect(server.mock.calls.map((c) => c[0])).toContain(
      "/api/desafios/d1/ranking",
    );
  });

  it("404 then 200 on rendir mounts the quiz", async () => {
    safe
      .mockResolvedValueOnce({ status: 404, data: null })
      .mockResolvedValueOnce({ status: 200, data: { id: "t1" } });
    await pagina();
    expect(screen.getByText("RENDIR")).toBeInTheDocument();
  });

  it("404 then 409 shows the closed block", async () => {
    safe
      .mockResolvedValueOnce({ status: 404, data: null })
      .mockResolvedValueOnce({ status: 409, data: null })
      .mockResolvedValueOnce({ status: 200, data: { id: "d1" } });
    await pagina();
    expect(
      screen.getByText("Este desafío no está disponible"),
    ).toBeInTheDocument();
    expect(screen.getByText("RANKING yo")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/grupos/g1/desafios",
    );
  });

  it("omits the ranking section when the detail is not readable", async () => {
    safe
      .mockResolvedValueOnce({ status: 404, data: null })
      .mockResolvedValueOnce({ status: 409, data: null })
      .mockResolvedValueOnce({ status: 404, data: null });
    await pagina();
    expect(screen.queryByText(/RANKING/)).toBeNull();
  });

  it("throws on an unexpected status from intentos/me", async () => {
    safe.mockResolvedValueOnce({ status: 500, data: null });
    await expect(pagina()).rejects.toThrow("API request failed: 500");
  });

  it("throws on an unexpected status from rendir", async () => {
    safe
      .mockResolvedValueOnce({ status: 404, data: null })
      .mockResolvedValueOnce({ status: 500, data: null });
    await expect(pagina()).rejects.toThrow("API request failed: 500");
  });

  it("404 then 404 shows not found", async () => {
    safe
      .mockResolvedValueOnce({ status: 404, data: null })
      .mockResolvedValueOnce({ status: 404, data: null });
    await pagina();
    expect(screen.getByText("Desafío no encontrado")).toBeInTheDocument();
  });
});
