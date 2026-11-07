import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RankingClient } from "../app/(app)/ranking/ranking-client";
import { Leaderboard } from "../components/ranking/leaderboard";
import { apiFetchClient } from "../lib/api-client";
import type { LeaderboardEntry, Materia } from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;

function entry(i: number, over: Partial<LeaderboardEntry> = {}) {
  return {
    user_id: `u${i}`,
    nombre: `Persona${i}`,
    desafios_ganados: 10 - i,
    suma_puntajes: 100 - i,
    posicion: i,
    ...over,
  };
}
const CINCO = [1, 2, 3, 4, 5].map((i) => entry(i));

const MATERIAS: Materia[] = [
  {
    id: "m1",
    nombre: "Cálculo",
    nombre_normalizado: "calculo",
    created_by: "u",
  },
  { id: "m2", nombre: "Física", nombre_normalizado: "fisica", created_by: "u" },
];

function stubMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  api.mockReset();
  stubMotion(false);
});

describe("Leaderboard", () => {
  it("puts the top 3 on the podium (2nd, 1st, 3rd) and the rest in the table, in received order", () => {
    render(<Leaderboard entries={CINCO} vacio="vacío" />);
    const podio = screen.getByRole("list", { name: "Podio" });
    const items = Array.from(podio.querySelectorAll("li"));
    expect(items.map((li) => li.getAttribute("data-podio"))).toEqual([
      "2",
      "1",
      "3",
    ]);
    expect(items[1]).toHaveTextContent("Persona1");
    expect(items[1]).toHaveTextContent("9 ganados");
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas.map((f) => f.textContent)).toEqual([
      "4Persona4696",
      "5Persona5595",
    ]);
  });

  it("shows members with 0/0 at the end without special treatment", () => {
    const entries = [
      entry(1),
      entry(2),
      entry(3),
      entry(4, { desafios_ganados: 0, suma_puntajes: 0 }),
    ];
    render(<Leaderboard entries={entries} vacio="vacío" />);
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("4Persona400");
  });

  it("renders fewer than 3 entries and no table", () => {
    render(<Leaderboard entries={[entry(1)]} vacio="vacío" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the empty message", () => {
    render(<Leaderboard entries={[]} vacio="Nada por aquí" />);
    expect(screen.getByText("Nada por aquí")).toBeInTheDocument();
  });

  it("does not break with reduced motion", () => {
    stubMotion(true);
    render(<Leaderboard entries={CINCO} vacio="vacío" />);
    expect(screen.getByText("Persona1")).toBeInTheDocument();
  });
});

describe("RankingClient", () => {
  it("renders the initial ranking and reloads on materia change", async () => {
    api.mockResolvedValueOnce([entry(1, { nombre: "Nueva" })]);
    render(<RankingClient materias={MATERIAS} initialEntries={CINCO} />);
    expect(screen.getByText("Persona1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m2" },
    });
    expect(screen.getByTestId("ranking-skeleton")).toBeInTheDocument();
    expect(await screen.findByText("Nueva")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/api/materias/m2/ranking");
    expect(screen.queryByText("Persona1")).toBeNull();
  });

  it("shows an empty message for a materia with no results", async () => {
    api.mockResolvedValueOnce([]);
    render(<RankingClient materias={MATERIAS} initialEntries={CINCO} />);
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m2" },
    });
    expect(
      await screen.findByText("Todavía no hay resultados para esta materia."),
    ).toBeInTheDocument();
  });

  it("shows an inline error with retry instead of throwing", async () => {
    api.mockRejectedValueOnce(new Error("API request failed: 500"));
    api.mockResolvedValueOnce([entry(1, { nombre: "Recuperada" })]);
    render(<RankingClient materias={MATERIAS} initialEntries={[]} />);
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m2" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("500");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Recuperada")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("falls back to a generic message for non-Error rejections", async () => {
    api.mockRejectedValueOnce("boom");
    render(<RankingClient materias={MATERIAS} initialEntries={[]} />);
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m2" },
    });
    expect(await screen.findByText("Algo salió mal.")).toBeInTheDocument();
  });

  it("handles a catalog without materias", () => {
    render(<RankingClient materias={[]} initialEntries={[]} />);
    expect(screen.getByText("Todavía no hay materias.")).toBeInTheDocument();
  });
});

describe("Leaderboard trofeo", () => {
  it("only shows the trophy when the leader has won something", () => {
    const { container, rerender } = render(
      <Leaderboard entries={CINCO} vacio="v" />,
    );
    expect(container.querySelector("svg.lucide-trophy")).not.toBeNull();
    rerender(
      <Leaderboard
        entries={[entry(1, { desafios_ganados: 0 }), entry(2)]}
        vacio="v"
      />,
    );
    expect(container.querySelector("svg.lucide-trophy")).toBeNull();
  });
});

describe("RankingClient carreras", () => {
  it("ignores a stale response from a previous materia and clears entries", async () => {
    let tarde!: (v: unknown) => void;
    api.mockReturnValueOnce(new Promise((r) => (tarde = r)));
    api.mockResolvedValueOnce([entry(1, { nombre: "Actual" })]);
    render(<RankingClient materias={MATERIAS} initialEntries={CINCO} />);
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m2" },
    });
    expect(screen.queryByText("Persona1")).toBeNull();
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m1" },
    });
    expect(await screen.findByText("Actual")).toBeInTheDocument();
    tarde([entry(1, { nombre: "Vieja" })]);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Vieja")).toBeNull();
    expect(screen.getByText("Actual")).toBeInTheDocument();
  });

  it("ignores a stale error", async () => {
    let falla!: (e: unknown) => void;
    api.mockReturnValueOnce(new Promise((_, rej) => (falla = rej)));
    api.mockResolvedValueOnce([entry(1, { nombre: "Actual" })]);
    render(<RankingClient materias={MATERIAS} initialEntries={CINCO} />);
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m2" },
    });
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "m1" },
    });
    expect(await screen.findByText("Actual")).toBeInTheDocument();
    falla(new Error("vieja"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
