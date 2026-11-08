import { describe, expect, it } from "vitest";
import {
  desafiosPendientes,
  mejoresPosiciones,
  tiempoRestante,
} from "../lib/dashboard";
import type { DesafioOut, Grupo, LeaderboardEntry } from "../lib/types";

const AHORA = new Date("2026-05-10T12:00:00Z").getTime();
const g = (id: string): Grupo => ({
  id,
  nombre: `G${id}`,
  materia_id: "m",
  materia_nombre: "M",
  owner_id: "o",
  codigo_invitacion: "X",
});
const d = (id: string, extra: Partial<DesafioOut> = {}): DesafioOut => ({
  id,
  grupo_id: "g1",
  test_id: "t",
  test_titulo: id,
  creado_por: "o",
  fecha_inicio: "2026-05-01T00:00:00Z",
  fecha_fin: null,
  estado: "abierto",
  ya_rindio: false,
  ...extra,
});
const e = (
  user_id: string,
  posicion: number,
  desafios_ganados = 0,
): LeaderboardEntry => ({
  user_id,
  nombre: user_id,
  desafios_ganados,
  suma_puntajes: 10,
  posicion,
});

describe("desafiosPendientes", () => {
  it("keeps takeable, not-yet-taken desafios, soonest deadline first", () => {
    const res = desafiosPendientes(
      [g("g1"), g("g2"), g("g3")],
      {
        g1: [
          d("sin-fin"),
          d("pronto", { fecha_fin: "2026-05-11T00:00:00Z" }),
          d("rendido", { ya_rindio: true }),
          d("cerrado", { estado: "cerrado" }),
          d("vencido", { fecha_fin: "2026-05-02T00:00:00Z" }),
        ],
        g2: [d("tarde", { fecha_fin: "2026-05-20T00:00:00Z" })],
      },
      AHORA,
    );
    expect(res.map((x) => x.id)).toEqual(["pronto", "tarde", "sin-fin"]);
    expect(res[1].grupo_nombre).toBe("Gg2");
  });
});

describe("mejoresPosiciones", () => {
  it("returns the user's standing per grupo, best first, skipping grupos without them", () => {
    const res = mejoresPosiciones(
      [g("a"), g("b"), g("c"), g("d")],
      {
        a: [e("x", 1), e("yo", 3, 1)],
        b: [e("yo", 1, 2), e("x", 2)],
        c: [e("x", 1)],
        d: [e("yo", 3, 4)],
      },
      "yo",
    );
    expect(
      res.map((p) => [p.grupo.id, p.posicion, p.participantes, p.ganados]),
    ).toEqual([
      ["b", 1, 2, 2],
      ["d", 3, 1, 4],
      ["a", 3, 2, 1],
    ]);
  });
});

describe("tiempoRestante", () => {
  it("formats the time left until a deadline", () => {
    expect(tiempoRestante(null, AHORA)).toBe("sin límite");
    expect(tiempoRestante("2026-05-10T12:30:00Z", AHORA)).toBe("menos de 1 h");
    expect(tiempoRestante("2026-05-11T15:00:00Z", AHORA)).toBe("quedan 27 h");
    expect(tiempoRestante("2026-05-15T12:00:00Z", AHORA)).toBe("quedan 5 días");
  });
});
