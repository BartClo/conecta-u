import { describe, expect, it } from "vitest";
import { semestreActivo } from "../lib/semestre";
import type { Semestre } from "../lib/types";

function s(nombre: string, inicio: string, fin: string): Semestre {
  return { id: nombre, nombre, fecha_inicio: inicio, fecha_fin: fin };
}

describe("semestreActivo", () => {
  it("returns null when there are no semestres", () => {
    expect(semestreActivo([])).toBeNull();
  });

  it("returns the semestre containing today's date", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const pasado = s("pasado", "2000-01-01", "2000-06-01");
    const actual = s("actual", "2000-01-01", "2999-01-01");
    expect(semestreActivo([pasado, actual])).toBe(actual);
    void hoy;
  });

  it("falls back to the most recent semestre when none is in range", () => {
    const viejo = s("viejo", "2000-01-01", "2000-06-01");
    const nuevo = s("nuevo", "2020-01-01", "2020-06-01");
    expect(semestreActivo([viejo, nuevo])).toBe(nuevo);
  });
});
