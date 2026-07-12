import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SemestreFormModal from "../components/SemestreFormModal";

describe("SemestreFormModal", () => {
  it("submits entered values", () => {
    const onSubmit = vi.fn();
    render(<SemestreFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "2026-1" } });
    fireEvent.change(screen.getByLabelText(/inicio/i), { target: { value: "2026-03-01" } });
    fireEvent.change(screen.getByLabelText(/fin/i), { target: { value: "2026-07-15" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: "2026-1",
      fecha_inicio: "2026-03-01",
      fecha_fin: "2026-07-15",
    });
  });

  it("pre-fills fields when editing an existing semestre", () => {
    render(
      <SemestreFormModal
        semestre={{
          id: "s1",
          nombre: "2026-1",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-15",
        }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/nombre/i)).toHaveValue("2026-1");
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(<SemestreFormModal onSubmit={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
