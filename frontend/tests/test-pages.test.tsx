import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TestDetalleClient } from "../app/(app)/materias/[materiaId]/tests/[testId]/test-detalle-client";
import { TestEditarClient } from "../app/(app)/materias/[materiaId]/tests/[testId]/editar/test-editar-client";
import { TestNuevoClient } from "../app/(app)/materias/[materiaId]/tests/nuevo/test-nuevo-client";
import { TestsClient } from "../app/(app)/materias/[materiaId]/tests/tests-client";
import { apiFetchClient } from "../lib/api-client";
import type { Test } from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;

const TEST: Test = {
  id: "t1",
  materia_id: "m1",
  titulo: "Parcial 1",
  descripcion: "Unidad 1",
  autor_id: "u1",
  origen: "manual",
  created_at: "2026-11-07T00:00:00Z",
  preguntas: [
    {
      id: "p1",
      enunciado: "¿2+2?",
      orden: 0,
      opciones: [
        { id: "o1", texto: "3", orden: 0, es_correcta: false },
        { id: "o2", texto: "4", orden: 1, es_correcta: true },
      ],
    },
  ],
};
// What a non-author receives: no es_correcta anywhere.
const AJENO: Test = {
  ...TEST,
  preguntas: [
    {
      ...TEST.preguntas[0],
      opciones: [
        { id: "o1", texto: "3", orden: 0 },
        { id: "o2", texto: "4", orden: 1 },
      ],
    },
  ],
};

beforeEach(() => {
  api.mockReset();
  push.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("TestsClient", () => {
  it("shows the empty state and the create link", () => {
    render(<TestsClient materiaId="m1" tests={[]} userId="u1" />);

    expect(
      screen.getByText(
        "Todavía no hay tests para esta materia. Crea el primero.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear test" })).toHaveAttribute(
      "href",
      "/materias/m1/tests/nuevo",
    );
    expect(
      screen.getByRole("link", { name: "Generar con IA" }),
    ).toHaveAttribute("href", "/materias/m1/tests/nuevo-ia");
  });

  it("lists cards with question count and author label", () => {
    const otro: Test = {
      ...TEST,
      id: "t2",
      titulo: "Otro",
      descripcion: null,
      autor_id: "u2",
      preguntas: [...TEST.preguntas, { ...TEST.preguntas[0], id: "p2" }],
    };
    render(<TestsClient materiaId="m1" tests={[TEST, otro]} userId="u1" />);

    expect(screen.getByText("1 pregunta · Tú")).toBeInTheDocument();
    expect(screen.getByText("2 preguntas · Otro autor")).toBeInTheDocument();
    expect(screen.getByText("Unidad 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Parcial 1/ })).toHaveAttribute(
      "href",
      "/materias/m1/tests/t1",
    );
  });
});

describe("TestDetalleClient", () => {
  it("shows the correct option and author actions to the author", () => {
    render(<TestDetalleClient test={TEST} userId="u1" />);

    expect(screen.getByText(/4 ✓ Correcta/)).toBeInTheDocument();
    expect(screen.getByText("Tú")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/materias/m1/tests/t1/editar",
    );
    expect(screen.getByRole("button", { name: "Borrar" })).toBeInTheDocument();
  });

  it("hides answers and actions from other users", () => {
    render(<TestDetalleClient test={AJENO} userId="u2" />);

    expect(screen.queryByText(/Correcta/)).not.toBeInTheDocument();
    expect(screen.getByText("Otro autor")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Borrar" })).toBeNull();
  });

  it("deletes after confirming and returns to the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.mockResolvedValue(undefined);
    render(<TestDetalleClient test={TEST} userId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/materias/m1/tests"),
    );
    expect(api).toHaveBeenCalledWith("/api/tests/t1", { method: "DELETE" });
  });

  it("does nothing when the confirmation is declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<TestDetalleClient test={TEST} userId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    expect(api).not.toHaveBeenCalled();
  });

  it("shows the error when deleting fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.mockRejectedValueOnce(new Error("API request failed: 403"));
    render(<TestDetalleClient test={TEST} userId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    expect(
      await screen.findByText("No tienes permiso para realizar esta acción."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("explains a 409 when the test is in use", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.mockRejectedValueOnce(new Error("API request failed: 409"));
    render(<TestDetalleClient test={TEST} userId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    expect(
      await screen.findByText(
        "Este test ya tiene desafíos y no se puede modificar",
      ),
    ).toBeInTheDocument();
  });

  it("falls back to a generic message for non-Error failures", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.mockRejectedValueOnce("boom");
    render(<TestDetalleClient test={TEST} userId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    expect(await screen.findByText("Algo salió mal.")).toBeInTheDocument();
  });
});

describe("TestNuevoClient", () => {
  it("posts the payload and goes to the new test", async () => {
    api.mockResolvedValue({ id: "t9" });
    render(<TestNuevoClient materiaId="m1" />);
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "T" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar pregunta" }));
    await screen.findByText("Pregunta 1");
    fireEvent.change(screen.getByLabelText("Enunciado de la pregunta 1"), {
      target: { value: "q" },
    });
    fireEvent.change(screen.getByLabelText("Opción 1 de la pregunta 1"), {
      target: { value: "a" },
    });
    fireEvent.change(screen.getByLabelText("Opción 2 de la pregunta 1"), {
      target: { value: "b" },
    });
    fireEvent.click(
      screen.getByLabelText(
        "Marcar la opción 1 de la pregunta 1 como correcta",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Crear test" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/materias/m1/tests/t9"),
    );
    expect(api).toHaveBeenCalledWith("/api/tests", {
      method: "POST",
      body: {
        materia_id: "m1",
        titulo: "T",
        descripcion: null,
        preguntas: [
          {
            enunciado: "q",
            opciones: [
              { texto: "a", es_correcta: true },
              { texto: "b", es_correcta: false },
            ],
          },
        ],
      },
    });
  });
});

describe("TestEditarClient", () => {
  it("shows a permission message instead of a form to non-authors", () => {
    render(<TestEditarClient test={AJENO} userId="u2" />);

    expect(
      screen.getByText("No tienes permiso para editar este test"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Título")).toBeNull();
  });

  it("prefills, sends a PUT and returns to the detail", async () => {
    api.mockResolvedValue(TEST);
    render(<TestEditarClient test={TEST} userId="u1" />);
    expect(screen.getByLabelText("Título")).toHaveValue("Parcial 1");

    fireEvent.click(screen.getByRole("button", { name: "Guardar test" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/materias/m1/tests/t1"),
    );
    expect(api.mock.calls[0][0]).toBe("/api/tests/t1");
    expect(api.mock.calls[0][1].method).toBe("PUT");
    expect(api.mock.calls[0][1].body.preguntas[0].opciones[1].es_correcta).toBe(
      true,
    );
  });

  it("maps a 403 to the permission message", async () => {
    api.mockRejectedValueOnce(new Error("API request failed: 403"));
    render(<TestEditarClient test={TEST} userId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar test" }));

    expect(
      await screen.findByText("No tienes permiso para editar este test"),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("passes other errors through", async () => {
    api.mockRejectedValueOnce(new Error("API request failed: 500"));
    render(<TestEditarClient test={TEST} userId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar test" }));

    expect(
      await screen.findByText("Error del servidor. Intenta de nuevo."),
    ).toBeInTheDocument();
  });
});
