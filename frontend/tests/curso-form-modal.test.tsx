import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CursoFormModal } from "../components/cursos/curso-form-modal";

describe("CursoFormModal", () => {
  it("submits entered values with the default color", async () => {
    const onSubmit = vi.fn();
    render(<CursoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "Cálculo II" },
    });
    fireEvent.change(screen.getByLabelText(/c.digo/i), {
      target: { value: "MAT204" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: "Cálculo II",
          codigo: "MAT204",
          profesor: null,
        }),
      ),
    );
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

  it("lets the user pick a color swatch", async () => {
    const onSubmit = vi.fn();
    render(<CursoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByLabelText(/c.digo/i), {
      target: { value: "X1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^green$/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ color: "green" }),
      ),
    );
  });
});
