import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonthGrid } from "../components/calendario/month-grid";

const OCURRENCIA = {
  id: "e1",
  curso_id: null,
  titulo: "Examen parcial",
  descripcion: null,
  tipo: "examen" as const,
  fecha_inicio: "2026-04-10T14:00:00",
  fecha_fin: null,
};

describe("MonthGrid", () => {
  it("renders ocurrencias on their day and handles clicks", () => {
    const onDayClick = vi.fn();
    const onOcurrenciaClick = vi.fn();

    render(
      <MonthGrid
        monthDate={new Date(2026, 3, 1)}
        ocurrencias={[OCURRENCIA]}
        onDayClick={onDayClick}
        onOcurrenciaClick={onOcurrenciaClick}
      />,
    );

    expect(screen.getByText("Examen parcial")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Examen parcial"));
    expect(onOcurrenciaClick).toHaveBeenCalledWith(OCURRENCIA);

    fireEvent.click(screen.getByText("15"));
    expect(onDayClick).toHaveBeenCalled();
  });
});
