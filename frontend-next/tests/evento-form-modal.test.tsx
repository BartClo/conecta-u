import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventoFormModal } from "../components/calendario/evento-form-modal";

const CURSOS = [
  {
    id: "c1",
    semestre_id: "s1",
    nombre: "Cálculo",
    codigo: "MAT100",
    profesor: null,
    color: "blue",
  },
];

describe("EventoFormModal", () => {
  it("crea un evento simple sin recurrencia ni curso", async () => {
    const onSubmit = vi.fn();
    render(
      <EventoFormModal
        cursos={CURSOS}
        fechaInicial="2026-04-10"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: "Gimnasio" },
    });
    fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), {
      target: { value: "2026-04-10T09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: "Gimnasio",
          recurrencia_dia_semana: null,
          curso_id: null,
        }),
      ),
    );
  });

  it("incluye recurrencia cuando se marca el checkbox", async () => {
    const onSubmit = vi.fn();
    render(
      <EventoFormModal cursos={CURSOS} onSubmit={onSubmit} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: "Clase de yoga" },
    });
    fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), {
      target: { value: "2026-03-02T07:00" },
    });
    fireEvent.click(screen.getByLabelText(/repetir semanalmente/i));
    fireEvent.change(screen.getByLabelText(/repetir hasta/i), {
      target: { value: "2026-06-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ recurrencia_hasta: "2026-06-01" }),
      ),
    );
  });
});
