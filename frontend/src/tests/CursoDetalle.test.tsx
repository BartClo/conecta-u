import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CursoDetalle from "../routes/CursoDetalle";
import { apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));

const CURSO = {
  id: "c1",
  semestre_id: "s1",
  nombre: "Cálculo II",
  codigo: "MAT204",
  profesor: "Ana Pérez",
  color: "blue",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/cursos/c1"]}>
      <Routes>
        <Route path="/cursos/:id" element={<CursoDetalle />} />
        <Route path="/cursos" element={<div>Cursos page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  (apiFetch as ReturnType<typeof vi.fn>).mockReset();
});

describe("CursoDetalle page", () => {
  it("shows the curso details", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(CURSO);
    renderPage();

    expect(await screen.findByText("Cálculo II")).toBeInTheDocument();
    expect(screen.getByText("MAT204")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });

  it("edits the curso", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === "PUT") return Promise.resolve({ ...CURSO, nombre: "Cálculo II (editado)" });
      return Promise.resolve(CURSO);
    });
    renderPage();

    await screen.findByText("Cálculo II");
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    fireEvent.change(screen.getByLabelText(/^nombre$/i), { target: { value: "Cálculo II (editado)" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("Cálculo II (editado)")).toBeInTheDocument();
  });

  it("deletes the curso and navigates back to /cursos", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === "DELETE") return Promise.resolve(undefined);
      return Promise.resolve(CURSO);
    });
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    renderPage();

    await screen.findByText("Cálculo II");
    fireEvent.click(screen.getByRole("button", { name: /borrar/i }));

    await waitFor(() => expect(screen.getByText("Cursos page")).toBeInTheDocument());
  });
});
