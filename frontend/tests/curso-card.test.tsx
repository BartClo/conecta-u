import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CursoCard } from "../components/cursos/curso-card";

describe("CursoCard", () => {
  it("renders curso details and links to its detail page", () => {
    render(
      <CursoCard
        curso={{
          id: "c1",
          semestre_id: "s1",
          nombre: "Cálculo II",
          codigo: "MAT204",
          profesor: "Ana Pérez",
          color: "blue",
        }}
      />,
    );

    expect(screen.getByText("Cálculo II")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/cursos/c1");
  });
});
