import { describe, expect, it } from "vitest";
import {
  GROUP_NODE_RADIUS,
  buildNodos,
  computeNodePositions,
} from "../components/dashboard/graph-3d";

describe("computeNodePositions", () => {
  it("places n cursos evenly around a circle, excluding the center", () => {
    const positions = computeNodePositions(4, 3);

    expect(positions).toHaveLength(4);
    positions.forEach((p) => {
      const distance = Math.sqrt(p[0] ** 2 + p[2] ** 2);
      expect(distance).toBeCloseTo(3, 5);
    });
  });

  it("returns an empty array for zero cursos", () => {
    expect(computeNodePositions(0, 3)).toEqual([]);
  });
});

describe("buildNodos", () => {
  const curso = {
    id: "c1",
    semestre_id: "s1",
    nombre: "Cálculo",
    codigo: "MAT",
    profesor: null,
    color: "blue",
  };
  const grupo = {
    id: "g1",
    nombre: "Estudio",
    materia_id: "m1",
    materia_nombre: "Cálculo",
    owner_id: "u1",
    codigo_invitacion: "ABC234",
  };

  it("combines cursos and grupos, giving grupos a larger radius", () => {
    const nodos = buildNodos([curso], [grupo, { ...grupo, id: "g2" }]);

    expect(nodos).toHaveLength(3);
    expect(nodos.map((n) => n.id)).toEqual([
      "curso-c1",
      "grupo-g1",
      "grupo-g2",
    ]);
    expect(nodos[1].radius).toBe(GROUP_NODE_RADIUS);
    expect(nodos[2].radius).toBe(GROUP_NODE_RADIUS);
    expect(GROUP_NODE_RADIUS).toBeGreaterThan(nodos[0].radius);
    expect(nodos[1].label).toBe("Estudio");
  });

  it("falls back to gray for an unknown curso color and handles no grupos", () => {
    const nodos = buildNodos([{ ...curso, color: "nope" }], []);

    expect(nodos).toHaveLength(1);
    expect(nodos[0].color).toBe("#888888");
  });
});
