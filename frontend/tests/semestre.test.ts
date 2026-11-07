import { describe, expect, it } from "vitest";
import { semestreActivo } from "../lib/semestre";

describe("semestreActivo", () => {
  it("returns null when there are no semestres", () => {
    expect(semestreActivo([])).toBeNull();
  });

  it("returns the semestre that contains today", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const actual = {
      id: "s1",
      nombre: "actual",
      fecha_inicio: "2000-01-01",
      fecha_fin: hoy,
    };
    const pasado = {
      id: "s0",
      nombre: "pasado",
      fecha_inicio: "1999-01-01",
      fecha_fin: "1999-12-31",
    };
    expect(semestreActivo([pasado, actual])).toEqual(actual);
  });

  it("falls back to the semestre with the latest fecha_fin when none contains today", () => {
    const antiguo = {
      id: "s1",
      nombre: "antiguo",
      fecha_inicio: "2000-01-01",
      fecha_fin: "2000-06-01",
    };
    const masReciente = {
      id: "s2",
      nombre: "reciente",
      fecha_inicio: "2010-01-01",
      fecha_fin: "2010-06-01",
    };
    expect(semestreActivo([antiguo, masReciente])).toEqual(masReciente);
  });
});
