import { describe, expect, it } from "vitest";
import { buildGraph, COLOR_TIPO } from "../lib/graph";
import type { Curso, Grupo, Miembro } from "../lib/types";

const grupo = (
  id: string,
  materia_id: string,
  materia_nombre: string,
): Grupo => ({
  id,
  nombre: `Grupo ${id}`,
  materia_id,
  materia_nombre,
  owner_id: "yo",
  codigo_invitacion: "ABC234",
});
const curso = (id: string, nombre: string, color = "blue"): Curso => ({
  id,
  semestre_id: "s1",
  nombre,
  codigo: "MAT101",
  profesor: null,
  color,
});
const miembro = (user_id: string, nombre: string | null = null): Miembro => ({
  user_id,
  nombre,
  email: `${user_id}@u.cl`,
  rol: "member",
});

describe("buildGraph", () => {
  it("only has the user node when there is nothing else", () => {
    const g = buildGraph({ id: "yo", nombre: "Ada" }, [], [], {});
    expect(g.links).toEqual([]);
    expect(g.nodes).toEqual([
      expect.objectContaining({
        id: "yo",
        label: "Ada",
        detalle: "0 grupos · 0 cursos",
      }),
    ]);
  });

  it("links user→grupos→materias, cursos to their matching materia and mates to shared grupos", () => {
    const grupos = [
      grupo("g1", "m1", "Cálculo"),
      grupo("g2", "m1", "Cálculo"),
      grupo("g3", "m2", "Física"),
    ];
    const cursos = [curso("c1", " calculo "), curso("c2", "Química", "nope")];
    const miembros = {
      g1: [miembro("yo"), miembro("ana", "Ana"), miembro("beto")],
      g2: [miembro("ana", "Ana")],
    };
    const g = buildGraph({ id: "yo", nombre: "Ada" }, grupos, cursos, miembros);
    const nodo = (id: string) => g.nodes.find((n) => n.id === id)!;
    const tiene = (source: string, target: string) =>
      g.links.some((l) => l.source === source && l.target === target);

    expect(g.nodes.map((n) => n.id).sort()).toEqual(
      [
        "yo",
        "grupo-g1",
        "grupo-g2",
        "grupo-g3",
        "materia-m1",
        "materia-m2",
        "curso-c1",
        "curso-c2",
        "companero-ana",
        "companero-beto",
      ].sort(),
    );
    expect(nodo("yo").detalle).toBe("3 grupos · 2 cursos");
    expect(nodo("grupo-g1")).toMatchObject({
      href: "/grupos/g1",
      detalle: "Grupo · 3 miembros",
      color: COLOR_TIPO.grupo,
    });
    expect(nodo("grupo-g2").detalle).toBe("Grupo · 1 miembro");
    expect(nodo("grupo-g1").val).toBeGreaterThan(nodo("grupo-g3").val);
    expect(nodo("materia-m1")).toMatchObject({
      label: "Cálculo",
      detalle: "Materia · 2 grupos tuyos",
    });
    expect(nodo("materia-m2").detalle).toBe("Materia · 1 grupo tuyo");
    expect(nodo("curso-c1")).toMatchObject({
      href: "/cursos/c1",
      color: "#3b82f6",
    });
    expect(nodo("curso-c2").color).toBe("#6b7280");
    expect(nodo("companero-ana")).toMatchObject({
      label: "Ana",
      detalle: "Compañero · 2 grupos en común",
    });
    expect(nodo("companero-beto")).toMatchObject({
      label: "beto",
      detalle: "Compañero · 1 grupo en común",
    });
    expect(nodo("companero-ana").val).toBeGreaterThan(
      nodo("companero-beto").val,
    );
    expect(nodo("companero-ana").href).toBeUndefined();

    expect(tiene("yo", "grupo-g1")).toBe(true);
    expect(tiene("grupo-g3", "materia-m2")).toBe(true);
    expect(tiene("yo", "curso-c2")).toBe(true);
    expect(tiene("curso-c1", "materia-m1")).toBe(true);
    expect(
      g.links.some((l) => l.source === "curso-c2" && l.target !== "yo"),
    ).toBe(false);
    expect(tiene("companero-ana", "grupo-g2")).toBe(true);
    expect(g.links.some((l) => l.source === "companero-yo")).toBe(false);
    // every link endpoint is a real node
    const ids = new Set(g.nodes.map((n) => n.id));
    g.links.forEach((l) => {
      expect(ids.has(l.source)).toBe(true);
      expect(ids.has(l.target)).toBe(true);
    });
  });
});
