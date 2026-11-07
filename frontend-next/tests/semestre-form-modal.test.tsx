import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SemestreFormModal } from "../components/cursos/semestre-form-modal";

describe("SemestreFormModal", () => {
  it("submits entered values", async () => {
    const onSubmit = vi.fn();
    render(<SemestreFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "2026-2" },
    });
    fireEvent.change(screen.getByLabelText(/inicio/i), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText(/fin/i), {
      target: { value: "2026-12-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        nombre: "2026-2",
        fecha_inicio: "2026-08-01",
        fecha_fin: "2026-12-15",
      }),
    );
  });
});
