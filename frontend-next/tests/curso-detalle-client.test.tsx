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
});
