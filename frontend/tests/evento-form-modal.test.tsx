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
    fireEvent.change(screen.getByLabelText(/d.a de la semana/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/^tipo$/i), {
      target: { value: "examen" },
    });
    fireEvent.change(screen.getByLabelText(/repetir hasta/i), {
      target: { value: "2026-06-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrencia_hasta: "2026-06-01",
          recurrencia_dia_semana: 3,
          tipo: "examen",
        }),
      ),
    );
  });

  it("precarga los datos de un evento existente con recurrencia", () => {
    const EVENTO = {
      id: "e1",
      curso_id: "c1",
      titulo: "Clase de cálculo",
      descripcion: "Repaso de integrales",
      tipo: "clase" as const,
      fecha_inicio: "2026-03-02T07:00",
      fecha_fin: "2026-03-02T08:00",
      recurrencia_dia_semana: 2,
      recurrencia_hasta: "2026-06-01",
    };
    render(
      <EventoFormModal
        evento={EVENTO}
        cursos={CURSOS}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Editar evento")).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toHaveValue("Clase de cálculo");
    expect(screen.getByLabelText(/descripción/i)).toHaveValue(
      "Repaso de integrales",
    );
    expect(screen.getByLabelText(/repetir semanalmente/i)).toBeChecked();
    expect(screen.getByLabelText(/repetir hasta/i)).toHaveValue("2026-06-01");
  });

  it("incluye descripcion, curso y fecha_fin al editar y guardar", async () => {
    const onSubmit = vi.fn();
    const EVENTO = {
      id: "e1",
      curso_id: null,
      titulo: "Clase de cálculo",
      descripcion: "",
      tipo: "clase" as const,
      fecha_inicio: "2026-03-02T07:00",
      fecha_fin: null,
      recurrencia_dia_semana: null,
      recurrencia_hasta: null,
    };
    render(
      <EventoFormModal
        evento={EVENTO}
        cursos={CURSOS}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "Traer calculadora" },
    });
    fireEvent.change(screen.getByLabelText(/^curso$/i), {
      target: { value: "c1" },
    });
    fireEvent.change(screen.getByLabelText(/fecha y hora de fin/i), {
      target: { value: "2026-03-02T09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          descripcion: "Traer calculadora",
          curso_id: "c1",
          fecha_fin: "2026-03-02T09:00",
        }),
      ),
    );
  });

  it("llama a onClose al cancelar", () => {
    const onClose = vi.fn();
    render(
      <EventoFormModal cursos={CURSOS} onSubmit={vi.fn()} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
