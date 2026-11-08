import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ResultadoClient } from "../app/(app)/grupos/[id]/desafios/[desafioId]/resultado-client";
import { GruposClient } from "../app/(app)/grupos/grupos-client";
import { ResumenDetalleClient } from "../app/(app)/ia/resumenes/[id]/resumen-detalle-client";
import { RankingClient } from "../app/(app)/ranking/ranking-client";
import { DesafioRanking } from "../components/desafios/desafio-ranking";
import { GrupoCard } from "../components/grupos/grupo-card";
import { Leaderboard } from "../components/ranking/leaderboard";
import { Avatar, AvatarStack, iniciales } from "../components/shared/avatar";
import { Panel } from "../components/shared/panel";
import { statsDeGrupos } from "../lib/grupos";
import type { Grupo, LeaderboardEntry } from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const GRUPO: Grupo = {
  id: "g1",
  nombre: "Estudio",
  materia_id: "m1",
  materia_nombre: "Cálculo",
  owner_id: "u1",
  codigo_invitacion: "ABC234",
};

const entry = (n: number): LeaderboardEntry => ({
  user_id: `u${n}`,
  nombre: `Persona${n}`,
  desafios_ganados: 5 - n,
  suma_puntajes: 10 - n,
  posicion: n,
});

describe("statsDeGrupos", () => {
  it("summarises members, open desafios and my rank per group", () => {
    const desafio = { estado: "abierto" } as never;
    const stats = statsDeGrupos(
      [GRUPO, { ...GRUPO, id: "g2" }],
      { g1: [{ user_id: "u1", nombre: null, email: "a@x", rol: "owner" }] },
      { g1: [desafio, { estado: "cerrado" } as never] },
      { g1: [entry(1), entry(2)] },
      "u2",
    );
    expect(stats.g1).toEqual({
      miembros: ["a@x"],
      abiertos: 1,
      posicion: 2,
      participantes: 2,
    });
    expect(stats.g2).toEqual({
      miembros: [],
      abiertos: 0,
      posicion: null,
      participantes: 0,
    });
  });
});

describe("GrupoCard / GruposClient", () => {
  it("shows members, open desafios and position chips", () => {
    const { rerender } = render(
      <GrupoCard
        grupo={GRUPO}
        stats={{
          miembros: ["Ana Rojas", "Beto", "C", "D", "E", "F"],
          abiertos: 2,
          posicion: 5,
          participantes: 6,
        }}
      />,
    );
    expect(screen.getByText("6 miembros")).toBeInTheDocument();
    expect(screen.getByText("2 desafíos abiertos")).toBeInTheDocument();
    expect(screen.getByText("#5 de 6")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    rerender(
      <GrupoCard
        grupo={GRUPO}
        stats={{
          miembros: ["Ana"],
          abiertos: 1,
          posicion: 1,
          participantes: 1,
        }}
      />,
    );
    expect(screen.getByText("1 miembro")).toBeInTheDocument();
    expect(screen.getByText("1 desafío abierto")).toBeInTheDocument();
    expect(screen.getByText("#1 de 1")).toBeInTheDocument();
  });

  it("aggregates the best position across groups", () => {
    render(
      <GruposClient
        initialGrupos={[GRUPO, { ...GRUPO, id: "g2", nombre: "Otro" }]}
        stats={{
          g1: { miembros: [], abiertos: 1, posicion: 3, participantes: 4 },
          g2: { miembros: [], abiertos: 2, posicion: null, participantes: 0 },
        }}
      />,
    );
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("Sin ranking aún")).toBeInTheDocument();
  });
});

describe("shared components", () => {
  it("builds initials and an overflow counter", () => {
    expect(iniciales("ana rojas")).toBe("AR");
    expect(iniciales("")).toBe("?");
    render(<AvatarStack nombres={["a", "b", "c"]} max={2} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
    render(<Avatar nombre="Zed" />);
    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  it("renders a panel with a link and an extra slot", () => {
    render(
      <Panel titulo="T" icon={Users} tono="" href="/x" extra={<b>E</b>}>
        c
      </Panel>,
    );
    expect(screen.getByRole("link", { name: "Ver todo" })).toHaveAttribute(
      "href",
      "/x",
    );
    expect(screen.getByText("E")).toBeInTheDocument();
  });
});

describe("Leaderboard / RankingClient with the viewer", () => {
  const cinco = [1, 2, 3, 4, 5].map(entry);

  it("marks the viewer on the podium and in the table", () => {
    const { rerender, container } = render(
      <Leaderboard entries={cinco} vacio="v" userId="u1" />,
    );
    expect(screen.getByText("(tú)")).toBeInTheDocument();
    rerender(<Leaderboard entries={cinco} vacio="v" userId="u4" />);
    expect(container.querySelector('tr[data-yo="true"]')).toHaveTextContent(
      "Persona4",
    );
  });

  it("shows the viewer's position or a hint when absent", () => {
    const materias = [
      { id: "m1", nombre: "M", nombre_normalizado: "m", created_by: "x" },
    ];
    const { unmount } = render(
      <RankingClient materias={materias} initialEntries={cinco} userId="u2" />,
    );
    expect(screen.getByText("#2")).toBeInTheDocument();
    unmount();
    render(<RankingClient materias={materias} initialEntries={[entry(1)]} />);
    expect(
      screen.getByText("rinde un desafío para entrar"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 competidor")).toBeInTheDocument();
  });
});

describe("ResultadoClient feedback", () => {
  const intento = {
    id: "i",
    desafio_id: "d",
    user_id: "u",
    segundos: 5,
    finalizado_at: "",
  };

  it("adapts the message to the score", () => {
    const { rerender } = render(
      <ResultadoClient
        grupoId="g"
        miIntento={{ ...intento, puntaje: 1, total: 1 }}
      />,
    );
    expect(screen.getByText(/Impecable/)).toBeInTheDocument();
    expect(screen.getByText(/1\s+acierto$/)).toBeInTheDocument();
    rerender(
      <ResultadoClient
        grupoId="g"
        miIntento={{ ...intento, puntaje: 2, total: 3 }}
      />,
    );
    expect(screen.getByText(/Bien jugado/)).toBeInTheDocument();
    rerender(
      <ResultadoClient
        grupoId="g"
        miIntento={{ ...intento, puntaje: 0, total: 0 }}
      />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText(/Sigue practicando/)).toBeInTheDocument();
  });
});

describe("ResumenDetalleClient", () => {
  it("handles an empty source text", () => {
    render(
      <ResumenDetalleClient
        resumen={{
          id: "r",
          user_id: "u",
          materia_id: null,
          titulo: "T",
          contenido_fuente: "",
          contenido_resumen: "uno dos",
          created_at: "2026-01-01T00:00:00Z",
        }}
      />,
    );
    expect(screen.getByText("0% más corto")).toBeInTheDocument();
  });
});

describe("DesafioRanking", () => {
  it("renders nothing when there is nothing to show yet", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <DesafioRanking
          desafio={{
            id: "d1",
            grupo_id: "g1",
            test_titulo: "P",
            creado_por: "c",
            owner_id: "o",
            estado: "abierto",
            fecha_inicio: "2026-01-01T00:00:00Z",
            fecha_fin: null,
            ganador_user_id: null,
            ganador_nombre: null,
            premio_acreditado: false,
            premio_creditos: 0,
          }}
          ranking={null}
          userId="miembro"
        />
      </QueryClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
