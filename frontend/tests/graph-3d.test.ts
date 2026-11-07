import { describe, expect, it } from "vitest";
import { computeNodePositions } from "../components/dashboard/graph-3d";

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
