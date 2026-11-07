import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesafioRanking } from "../components/desafios/desafio-ranking";
import { apiFetchClient } from "../lib/api-client";
import { puedeCerrar } from "../lib/desafios";
import type { DesafioDetalle, RankingDesafioEntry } from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;

const DESAFIO: DesafioDetalle = {
  id: "d1",
  grupo_id: "g1",
  test_titulo: "Parcial",
  creado_por: "creador",
  owner_id: "owner",
  estado: "abierto",
  fecha_inicio: "2026-01-01T00:00:00Z",
  fecha_fin: null,
  ganador_user_id: null,
  ganador_nombre: null,
  premio_acreditado: false,
  premio_creditos: 0,
};
const RANKING: RankingDesafioEntry[] = [
  {
    user_id: "autor",
    nombre: "Autora",
    puntaje: 2,
    total: 2,
    segundos: 5,
    posicion: 1,
    elegible: false,
  },
  {
    user_id: "beto",
    nombre: "Beto",
    puntaje: 1,
    total: 2,
    segundos: 70,
    posicion: 2,
    elegible: true,
  },
];

let client: QueryClient;
function renderRanking(
  over: Partial<DesafioDetalle> = {},
  userId = "creador",
  ranking = RANKING,
) {
  return render(
    <QueryClientProvider client={client}>
      <DesafioRanking
        desafio={{ ...DESAFIO, ...over }}
        ranking={ranking}
        userId={userId}
      />
    </QueryClientProvider>,
  );
}
const boton = () =>
  screen.queryByRole("button", { name: /Cerrar desafío|Cerrando/ });

beforeEach(() => {
  api.mockReset();
  client = new QueryClient();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("puedeCerrar", () => {
  const base = {
    estado: "abierto" as const,
    creado_por: "c",
    owner_id: "o",
    fecha_fin: "2026-01-01T00:00:00Z",
  };
  const despues = new Date("2026-02-01T00:00:00Z").getTime();
  const antes = new Date("2025-12-01T00:00:00Z").getTime();

  it("allows creator and owner any time while open", () => {
    expect(puedeCerrar(base, "c", true, antes)).toBe(true);
    expect(puedeCerrar(base, "o", false)).toBe(true);
  });
  it("allows any member only after fecha_fin", () => {
    expect(puedeCerrar(base, "m", true, antes)).toBe(false);
    expect(puedeCerrar(base, "m", false, despues)).toBe(false);
    expect(puedeCerrar(base, "m", true, despues)).toBe(true);
    expect(puedeCerrar({ ...base, fecha_fin: null }, "m", true, despues)).toBe(
      false,
    );
  });
  it("never when already closed", () => {
    expect(
      puedeCerrar({ ...base, estado: "cerrado" }, "c", true, despues),
    ).toBe(false);
  });
});

describe("DesafioRanking close button", () => {
  it("shows for creator and owner, hides for a plain member", () => {
    renderRanking({}, "creador");
    expect(boton()).toBeInTheDocument();
    renderRanking({}, "owner");
    expect(
      screen.getAllByRole("button", { name: "Cerrar desafío" }),
    ).toHaveLength(2);
  });

  it("hides for a plain member before fecha_fin and shows after it", () => {
    const { unmount } = renderRanking(
      { fecha_fin: "2999-01-01T00:00:00Z" },
      "miembro",
    );
    expect(boton()).toBeNull();
    unmount();
    renderRanking({ fecha_fin: "2020-01-01T00:00:00Z" }, "miembro");
    expect(boton()).toBeInTheDocument();
  });

  it("hides when already closed", () => {
    renderRanking({ estado: "cerrado" }, "creador");
    expect(boton()).toBeNull();
  });

  it("does not call the API when the confirm is rejected", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRanking();
    fireEvent.click(boton()!);
    expect(api).not.toHaveBeenCalled();
  });

  it("closes, shows winner and the prize from the response, and invalidates creditos", async () => {
    let resolver!: (v: unknown) => void;
    api.mockReturnValueOnce(new Promise((r) => (resolver = r)));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    renderRanking();
    fireEvent.click(boton()!);
    expect(screen.getByRole("button", { name: "Cerrando..." })).toBeDisabled();
    resolver({
      id: "d1",
      estado: "cerrado",
      ganador_user_id: "beto",
      ganador_nombre: "Beto",
      premio_acreditado: true,
      premio_creditos: 25,
    });
    expect(
      await screen.findByText("+25 créditos para Beto"),
    ).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/api/desafios/d1/cerrar", {
      method: "POST",
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["creditos"] });
    expect(boton()).toBeNull();
    // Winner comes from ganador_user_id, not from posicion === 1.
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas[0]).toHaveAttribute("data-ganador", "false");
    expect(filas[1]).toHaveAttribute("data-ganador", "true");
    expect(screen.getByText("no elegible")).toBeInTheDocument();
  });

  it("shows an error and re-enables the button on failure", async () => {
    api.mockRejectedValueOnce(new Error("API request failed: 500"));
    renderRanking();
    fireEvent.click(boton()!);
    expect(await screen.findByRole("alert")).toHaveTextContent("500");
    expect(
      screen.getByRole("button", { name: "Cerrar desafío" }),
    ).toBeEnabled();
  });

  it("uses a generic message for non-Error failures", async () => {
    api.mockRejectedValueOnce("boom");
    renderRanking();
    fireEvent.click(boton()!);
    expect(await screen.findByText("Algo salió mal.")).toBeInTheDocument();
  });
});

describe("DesafioRanking states", () => {
  it("does not highlight anyone while open", () => {
    renderRanking({}, "miembro");
    for (const fila of screen.getAllByRole("row").slice(1)) {
      expect(fila).toHaveAttribute("data-ganador", "false");
    }
    expect(screen.queryByText(/Ganador:/)).toBeNull();
  });

  it("shows 'cerrado sin ganador' when closed with no winner", () => {
    renderRanking({ estado: "cerrado" });
    expect(screen.getByText("Desafío cerrado sin ganador")).toBeInTheDocument();
  });

  it("shows the winner without prize text when none was credited", () => {
    renderRanking({
      estado: "cerrado",
      ganador_user_id: "beto",
      ganador_nombre: "Beto",
    });
    expect(screen.getByText(/Ganador:/)).toHaveTextContent("Beto");
    expect(screen.queryByText(/créditos para/)).toBeNull();
  });

  it("shows the empty message when nobody played", () => {
    renderRanking({}, "miembro", []);
    expect(
      screen.getByText("Nadie ha respondido este desafío todavía."),
    ).toBeInTheDocument();
  });

  it("does not break with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderRanking({ estado: "cerrado" });
    expect(screen.getByText("Desafío cerrado sin ganador")).toBeInTheDocument();
  });
});
