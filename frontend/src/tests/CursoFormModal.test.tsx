import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CursoFormModal from "../components/CursoFormModal";

describe("CursoFormModal", () => {
  it("submits entered values with the default color", () => {
    const onSubmit = vi.fn();
    render(<CursoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Cálculo II" } });
    fireEvent.change(screen.getByLabelText(/c.digo/i), { target: { value: "MAT204" } });
    fireEvent.change(screen.getByLabelText(/profesor/i), { target: { value: "Ana Pérez" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: "Cálculo II",
      codigo: "MAT204",
      profesor: "Ana Pérez",
      color: "red",
    });
  });

  it("pre-fills fields when editing an existing curso", () => {
    render(
      <CursoFormModal
        curso={{
          id: "c1",
          semestre_id: "s1",
          nombre: "Cálculo II",
          codigo: "MAT204",
          profesor: "Ana Pérez",
          color: "blue",
        }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Cálculo II");
  });

  it("lets the user pick a color swatch", () => {
    const onSubmit = vi.fn();
    render(<CursoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText(/c.digo/i), { target: { value: "X1" } });
    fireEvent.click(screen.getByRole("button", { name: /^green$/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: "X",
      codigo: "X1",
      profesor: "",
      color: "green",
    });
  });
});
