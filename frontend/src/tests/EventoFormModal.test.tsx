import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EventoFormModal from "../components/EventoFormModal";

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
  it("crea un evento simple sin recurrencia ni curso", () => {
    const onSubmit = vi.fn();
    render(
      <EventoFormModal
        cursos={CURSOS}
        fechaInicial="2026-04-10"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Gimnasio" } });
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: "personal" } });
    fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), {
      target: { value: "2026-04-10T09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      titulo: "Gimnasio",
      descripcion: null,
      tipo: "personal",
      fecha_inicio: "2026-04-10T09:00",
      fecha_fin: null,
      curso_id: null,
      recurrencia_dia_semana: null,
      recurrencia_hasta: null,
    });
  });

  it("incluye recurrencia cuando se marca el checkbox", () => {
    const onSubmit = vi.fn();
    render(<EventoFormModal cursos={CURSOS} onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Clase de yoga" } });
    fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), {
      target: { value: "2026-03-02T07:00" },
    });
    fireEvent.click(screen.getByLabelText(/repetir semanalmente/i));
    fireEvent.change(screen.getByLabelText(/día de la semana/i), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/repetir hasta/i), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ recurrencia_dia_semana: 0, recurrencia_hasta: "2026-06-01" }),
    );
  });

  it("precarga los valores al editar un evento existente, incluyendo curso y recurrencia", () => {
    const evento = {
      id: "e1",
      curso_id: "c1",
      titulo: "Examen parcial",
      descripcion: "Capítulos 1-3",
      tipo: "examen" as const,
      fecha_inicio: "2026-04-10T14:00",
      fecha_fin: null,
      recurrencia_dia_semana: 2,
      recurrencia_hasta: "2026-06-01",
    };
    render(
      <EventoFormModal evento={evento} cursos={CURSOS} onSubmit={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByLabelText(/título/i)).toHaveValue("Examen parcial");
    expect(screen.getByLabelText(/curso/i)).toHaveValue("c1");
    expect(screen.getByLabelText(/repetir semanalmente/i)).toBeChecked();
    expect(screen.getByLabelText(/día de la semana/i)).toHaveValue("2");
  });

  it("incluye descripción, curso asociado y fecha de fin cuando se completan", () => {
    const onSubmit = vi.fn();
    render(<EventoFormModal cursos={CURSOS} onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Examen" } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: "Capítulos 1-3" } });
    fireEvent.change(screen.getByLabelText(/curso/i), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), {
      target: { value: "2026-04-10T14:00" },
    });
    fireEvent.change(screen.getByLabelText(/fecha y hora de fin/i), {
      target: { value: "2026-04-10T16:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: "Capítulos 1-3",
        curso_id: "c1",
        fecha_fin: "2026-04-10T16:00",
      }),
    );
  });

  it("cierra el modal sin enviar al cancelar", () => {
    const onClose = vi.fn();
    render(<EventoFormModal cursos={CURSOS} onSubmit={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
