import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Cursos from "../routes/Cursos";
import { apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));

const SEMESTRE = { id: "s1", nombre: "2026-1", fecha_inicio: "2000-01-01", fecha_fin: "2999-01-01" };
const CURSO = {
  id: "c1",
  semestre_id: "s1",
  nombre: "Cálculo II",
  codigo: "MAT204",
  profesor: "Ana Pérez",
  color: "blue",
};

beforeEach(() => {
  (apiFetch as ReturnType<typeof vi.fn>).mockReset();
});

function mockList() {
  (apiFetch as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
    if (path === "/api/semestres") return Promise.resolve([SEMESTRE]);
    if (path.startsWith("/api/cursos")) return Promise.resolve([CURSO]);
    return Promise.reject(new Error(`unexpected path ${path}`));
  });
}

describe("Cursos page", () => {
  it("shows courses for the active semestre", async () => {
    mockList();
    render(
      <MemoryRouter>
        <Cursos />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Cálculo II")).toBeInTheDocument();
    expect(screen.getByText("MAT204")).toBeInTheDocument();
  });

  it("shows an empty state prompting to create a semestre first", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Cursos />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/crea tu primer semestre/i)).toBeInTheDocument();
  });

  it("creates a new curso and refreshes the list", async () => {
    mockList();
    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation((path: string, opts?: { method?: string }) => {
      if (path === "/api/semestres") return Promise.resolve([SEMESTRE]);
      if (path.startsWith("/api/cursos") && opts?.method === "POST") return Promise.resolve(CURSO);
      if (path.startsWith("/api/cursos")) return Promise.resolve([CURSO]);
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    render(
      <MemoryRouter>
        <Cursos />
      </MemoryRouter>,
    );

    await screen.findByText("Cálculo II");
    fireEvent.click(screen.getByRole("button", { name: /nuevo curso/i }));
    fireEvent.change(screen.getByLabelText(/^nombre$/i), { target: { value: "Física I" } });
    fireEvent.change(screen.getByLabelText(/c.digo/i), { target: { value: "FIS101" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/cursos",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});
