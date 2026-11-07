import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CursosClient } from "../app/(app)/cursos/cursos-client";
import { apiFetchClient } from "../lib/api-client";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));

const SEMESTRE = {
  id: "s1",
  nombre: "2026-1",
  fecha_inicio: "2000-01-01",
  fecha_fin: "2999-01-01",
};
const CURSO = {
  id: "c1",
  semestre_id: "s1",
  nombre: "Cálculo II",
  codigo: "MAT204",
  profesor: "Ana Pérez",
  color: "blue",
};

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  (apiFetchClient as ReturnType<typeof vi.fn>).mockReset();
});

describe("CursosClient", () => {
  it("shows cursos for the initially active semestre", () => {
    renderWithQuery(
      <CursosClient initialSemestres={[SEMESTRE]} initialCursos={[CURSO]} />,
    );

    expect(screen.getByText("Cálculo II")).toBeInTheDocument();
  });

  it("shows an empty state when there are no semestres", () => {
    renderWithQuery(<CursosClient initialSemestres={[]} initialCursos={[]} />);

    expect(screen.getByText(/crea tu primer semestre/i)).toBeInTheDocument();
  });

  it("creates a new curso and shows it in the list", async () => {
    (apiFetchClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...CURSO,
      id: "c2",
      nombre: "Física I",
    });
    renderWithQuery(
      <CursosClient initialSemestres={[SEMESTRE]} initialCursos={[CURSO]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nuevo curso/i }));
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Física I" },
    });
    fireEvent.change(screen.getByLabelText(/c.digo/i), {
      target: { value: "FIS101" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(screen.getByText("Física I")).toBeInTheDocument(),
    );
  });

  it("creates a new semestre and selects it", async () => {
    const NUEVO_SEMESTRE = {
      id: "s2",
      nombre: "2026-2",
      fecha_inicio: "2026-07-01",
      fecha_fin: "2026-12-01",
    };
    (apiFetchClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      NUEVO_SEMESTRE,
    );
    renderWithQuery(
      <CursosClient initialSemestres={[SEMESTRE]} initialCursos={[CURSO]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nuevo semestre/i }));
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "2026-2" },
    });
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText(/fecha de fin/i), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(apiFetchClient).toHaveBeenCalledWith(
        "/api/semestres",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(screen.getByRole("option", { name: "2026-2" })).toBeInTheDocument();
  });

  it("reloads cursos when a different semestre is selected", async () => {
    const SEMESTRE2 = {
      id: "s2",
      nombre: "2026-2",
      fecha_inicio: "2026-07-01",
      fecha_fin: "2026-12-01",
    };
    const CURSO2 = { ...CURSO, id: "c2", nombre: "Álgebra" };
    (apiFetchClient as ReturnType<typeof vi.fn>).mockResolvedValue([CURSO2]);
    renderWithQuery(
      <CursosClient
        initialSemestres={[SEMESTRE, SEMESTRE2]}
        initialCursos={[CURSO]}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "s2" },
    });

    await waitFor(() =>
      expect(apiFetchClient).toHaveBeenCalledWith("/api/cursos?semestre_id=s2"),
    );
    await waitFor(() =>
      expect(screen.getByText("Álgebra")).toBeInTheDocument(),
    );
  });

  it("closes the semestre and curso modals without submitting", () => {
    renderWithQuery(
      <CursosClient initialSemestres={[SEMESTRE]} initialCursos={[CURSO]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /nuevo semestre/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByText("Nuevo semestre")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /nuevo curso/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByLabelText(/c.digo/i)).not.toBeInTheDocument();
    expect(apiFetchClient).not.toHaveBeenCalled();
  });
});
