import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CalendarioClient } from "../app/(app)/calendario/calendario-client";
import { apiFetchClient } from "../lib/api-client";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));

const hoy = new Date();
const diaDelMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-10T14:00:00`;

const OCURRENCIA = {
  id: "e1",
  curso_id: null,
  titulo: "Examen parcial",
  descripcion: null,
  tipo: "examen" as const,
  fecha_inicio: diaDelMesActual,
  fecha_fin: null,
};

beforeEach(() => {
  (apiFetchClient as ReturnType<typeof vi.fn>).mockReset();
  (apiFetchClient as ReturnType<typeof vi.fn>).mockImplementation(
    (path: string) => {
      if (path.startsWith("/api/eventos")) return Promise.resolve([OCURRENCIA]);
      return Promise.reject(new Error(`unexpected path ${path}`));
    },
  );
});

describe("CalendarioClient", () => {
  it("muestra los eventos del mes visible inicial", () => {
    render(
      <CalendarioClient
        initialOcurrencias={[OCURRENCIA]}
        initialMonth={hoy.toISOString()}
        cursos={[]}
      />,
    );
    expect(screen.getByText("Examen parcial")).toBeInTheDocument();
  });

  it("navega al mes siguiente y recarga eventos", async () => {
    render(
      <CalendarioClient
        initialOcurrencias={[OCURRENCIA]}
        initialMonth={hoy.toISOString()}
        cursos={[]}
      />,
    );

    const llamadasIniciales = (apiFetchClient as ReturnType<typeof vi.fn>).mock
      .calls.length;
    fireEvent.click(screen.getByRole("button", { name: /mes siguiente/i }));

    await waitFor(() =>
      expect(
        (apiFetchClient as ReturnType<typeof vi.fn>).mock.calls.length,
      ).toBeGreaterThan(llamadasIniciales),
    );
  });

  it("abre el modal de edicion con el evento completo al hacer click en una ocurrencia", async () => {
    const EVENTO_COMPLETO = {
      ...OCURRENCIA,
      recurrencia_dia_semana: null,
      recurrencia_hasta: null,
    };
    (apiFetchClient as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string) => {
        if (path.startsWith("/api/eventos/e1"))
          return Promise.resolve(EVENTO_COMPLETO);
        if (path.startsWith("/api/eventos"))
          return Promise.resolve([OCURRENCIA]);
        return Promise.reject(new Error(`unexpected path ${path}`));
      },
    );

    render(
      <CalendarioClient
        initialOcurrencias={[OCURRENCIA]}
        initialMonth={hoy.toISOString()}
        cursos={[]}
      />,
    );

    fireEvent.click(screen.getByText("Examen parcial"));

    await waitFor(() =>
      expect(screen.getByText("Editar evento")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /borrar evento/i }),
    ).toBeInTheDocument();
  });

  it("cierra el modal sin guardar al cancelar", async () => {
    render(
      <CalendarioClient
        initialOcurrencias={[]}
        initialMonth={hoy.toISOString()}
        cursos={[]}
      />,
    );

    fireEvent.click(screen.getAllByText("1")[0]);
    await waitFor(() =>
      expect(screen.getByText("Nuevo evento")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    await waitFor(() =>
      expect(screen.queryByText("Nuevo evento")).not.toBeInTheDocument(),
    );
  });
});
