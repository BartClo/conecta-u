import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CursoDetalleClient } from "../app/(app)/cursos/[id]/curso-detalle-client";
import { apiFetchClient } from "../lib/api-client";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const CURSO = {
  id: "c1",
  semestre_id: "s1",
  nombre: "Cálculo II",
  codigo: "MAT204",
  profesor: "Ana Pérez",
  color: "blue",
};

describe("CursoDetalleClient", () => {
  it("shows curso details and deletes on confirm", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    (apiFetchClient as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<CursoDetalleClient curso={CURSO} />);

    expect(screen.getByText("Cálculo II")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /borrar/i }));

    await waitFor(() =>
      expect(apiFetchClient).toHaveBeenCalledWith("/api/cursos/c1", {
        method: "DELETE",
      }),
    );
  });

  it("does not delete when the user cancels the confirm dialog", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    (apiFetchClient as ReturnType<typeof vi.fn>).mockReset();

    render(<CursoDetalleClient curso={CURSO} />);
    fireEvent.click(screen.getByRole("button", { name: /borrar/i }));

    expect(apiFetchClient).not.toHaveBeenCalled();
  });

  it("edits the curso and shows the updated data", async () => {
    const ACTUALIZADO = { ...CURSO, nombre: "Cálculo III" };
    (apiFetchClient as ReturnType<typeof vi.fn>).mockReset();
    (apiFetchClient as ReturnType<typeof vi.fn>).mockResolvedValue(ACTUALIZADO);

    render(<CursoDetalleClient curso={CURSO} />);
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Cálculo III" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(apiFetchClient).toHaveBeenCalledWith(
        "/api/cursos/c1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("Cálculo III")).toBeInTheDocument(),
    );
  });

  it("closes the edit modal without submitting when cancelled", () => {
    render(<CursoDetalleClient curso={CURSO} />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });
});
