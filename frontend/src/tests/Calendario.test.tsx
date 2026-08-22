import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Calendario from "../routes/Calendario";
import { apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));

const hoy = new Date();
const diaDelMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-10T14:00:00`;

const OCURRENCIA = {
  id: "e1",
  curso_id: null,
  titulo: "Examen parcial",
  descripcion: null,
  tipo: "examen",
  fecha_inicio: diaDelMesActual,
  fecha_fin: null,
};

const EVENTO = {
  id: "e1",
  curso_id: null,
  titulo: "Examen parcial",
  descripcion: null,
  tipo: "examen",
  fecha_inicio: diaDelMesActual,
  fecha_fin: null,
  recurrencia_dia_semana: null,
  recurrencia_hasta: null,
};

beforeEach(() => {
  (apiFetch as ReturnType<typeof vi.fn>).mockReset();
});

function mockDefault() {
  (apiFetch as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
    if (path.startsWith("/api/eventos/")) return Promise.resolve(EVENTO);
    if (path.startsWith("/api/eventos")) return Promise.resolve([OCURRENCIA]);
    if (path.startsWith("/api/cursos")) return Promise.resolve([]);
    return Promise.reject(new Error(`unexpected path ${path}`));
  });
}

describe("Calendario page", () => {
  it("carga y muestra los eventos del mes visible", async () => {
    mockDefault();
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Examen parcial")).toBeInTheDocument();
  });

  it("navega al mes siguiente y recarga eventos", async () => {
    mockDefault();
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    await screen.findByText("Examen parcial");
    const llamadasIniciales = (apiFetch as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /mes siguiente/i }));

    await waitFor(() => {
      expect((apiFetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
        llamadasIniciales,
      );
    });
  });

  it("navega al mes anterior y recarga eventos", async () => {
    mockDefault();
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    await screen.findByText("Examen parcial");
    const llamadasIniciales = (apiFetch as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /mes anterior/i }));

    await waitFor(() => {
      expect((apiFetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
        llamadasIniciales,
      );
    });
  });

  it("cierra el modal de creación sin enviar al cancelar", async () => {
    mockDefault();
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    await screen.findByText("Examen parcial");
    fireEvent.click(screen.getByText("15"));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByLabelText(/título/i)).not.toBeInTheDocument();
  });

  it("crea un evento al hacer click en un día vacío", async () => {
    mockDefault();
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    await screen.findByText("Examen parcial");
    fireEvent.click(screen.getByText("15"));
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Nuevo evento" } });

    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string, opts?: { method?: string }) => {
        if (path === "/api/eventos" && opts?.method === "POST") return Promise.resolve(EVENTO);
        if (path.startsWith("/api/eventos")) return Promise.resolve([OCURRENCIA]);
        if (path.startsWith("/api/cursos")) return Promise.resolve([]);
        return Promise.reject(new Error(`unexpected path ${path}`));
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/eventos",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("edita un evento existente al hacer click en su chip", async () => {
    mockDefault();
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Examen parcial"));

    expect(await screen.findByDisplayValue("Examen parcial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /borrar evento/i })).toBeInTheDocument();
  });

  it("guarda la edición de un evento existente vía PUT", async () => {
    mockDefault();
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Examen parcial"));
    await screen.findByDisplayValue("Examen parcial");
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Editado" } });

    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string, opts?: { method?: string }) => {
        if (path === "/api/eventos/e1" && opts?.method === "PUT") return Promise.resolve(EVENTO);
        if (path.startsWith("/api/eventos")) return Promise.resolve([OCURRENCIA]);
        if (path.startsWith("/api/cursos")) return Promise.resolve([]);
        return Promise.reject(new Error(`unexpected path ${path}`));
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/eventos/e1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("no borra el evento si se cancela la confirmación", async () => {
    mockDefault();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Examen parcial"));
    const llamadasIniciales = (apiFetch as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.click(await screen.findByRole("button", { name: /borrar evento/i }));

    expect((apiFetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(llamadasIniciales);
  });

  it("borra un evento tras confirmar", async () => {
    mockDefault();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MemoryRouter>
        <Calendario />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Examen parcial"));
    await screen.findByRole("button", { name: /borrar evento/i });

    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string, opts?: { method?: string }) => {
        if (opts?.method === "DELETE") return Promise.resolve(undefined);
        if (path.startsWith("/api/eventos")) return Promise.resolve([]);
        if (path.startsWith("/api/cursos")) return Promise.resolve([]);
        return Promise.reject(new Error(`unexpected path ${path}`));
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /borrar evento/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/eventos/e1",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
});
