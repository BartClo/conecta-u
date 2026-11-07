import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TestEditor, toFormValues } from "../components/tests/test-editor";
import type { Test } from "../lib/types";

function setup(props: Partial<Parameters<typeof TestEditor>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<TestEditor materiaId="m1" onSubmit={onSubmit} {...props} />);
  return onSubmit;
}

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const radio = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement;

async function agregarPregunta(n = 1) {
  click("Agregar pregunta");
  await screen.findByText(`Pregunta ${n}`);
}

describe("TestEditor", () => {
  it("starts empty with the add-question button", () => {
    setup();

    expect(screen.queryByText("Pregunta 1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar pregunta" }),
    ).toBeInTheDocument();
  });

  it("adds a question with two empty options and nothing marked", async () => {
    setup();
    await agregarPregunta();

    expect(screen.getByText("Pregunta 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Opción 1 de la pregunta 1")).toHaveValue("");
    expect(screen.getByLabelText("Opción 2 de la pregunta 1")).toHaveValue("");
    expect(
      screen
        .getAllByRole("radio")
        .filter((r) => (r as HTMLInputElement).checked),
    ).toHaveLength(0);
  });

  it("adds options sharing the same radio group and hides remove at the minimum", async () => {
    setup();
    await agregarPregunta();
    expect(
      screen.queryByRole("button", { name: /Quitar la opción/ }),
    ).toBeNull();

    click("Agregar opción");

    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    expect(
      screen.getAllByRole("button", { name: /Quitar la opción/ }),
    ).toHaveLength(3);
  });

  it("keeps radios mutually exclusive", async () => {
    setup();
    await agregarPregunta();
    const r1 = radio("Marcar la opción 1 de la pregunta 1 como correcta");
    const r2 = radio("Marcar la opción 2 de la pregunta 1 como correcta");

    fireEvent.click(r1);
    expect(r1.checked).toBe(true);
    fireEvent.click(r2);

    expect(r2.checked).toBe(true);
    expect(r1.checked).toBe(false);
  });

  it("clears the marked option when it is removed", async () => {
    setup();
    await agregarPregunta();
    click("Agregar opción");
    fireEvent.click(radio("Marcar la opción 2 de la pregunta 1 como correcta"));

    click("Quitar la opción 2 de la pregunta 1");

    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(2));
    expect(
      (screen.getAllByRole("radio") as HTMLInputElement[]).some(
        (r) => r.checked,
      ),
    ).toBe(false);
  });

  it("reindexes the marked option when an earlier one is removed", async () => {
    const onSubmit = setup();
    await agregarPregunta();
    click("Agregar opción");
    type("Enunciado de la pregunta 1", "q");
    type("Opción 1 de la pregunta 1", "a");
    type("Opción 2 de la pregunta 1", "b");
    type("Opción 3 de la pregunta 1", "c");
    fireEvent.click(radio("Marcar la opción 3 de la pregunta 1 como correcta"));

    click("Quitar la opción 1 de la pregunta 1");
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(2));
    type("Título", "T");
    click("Guardar test");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].preguntas[0].opciones).toEqual([
      { texto: "b", es_correcta: false },
      { texto: "c", es_correcta: true },
    ]);
  });

  it("removes only the chosen question", async () => {
    setup();
    await agregarPregunta();
    await agregarPregunta(2);
    type("Enunciado de la pregunta 2", "segunda");

    const quitar = screen.getAllByRole("button", { name: "Quitar pregunta" });
    fireEvent.click(quitar[0]);

    await waitFor(() =>
      expect(screen.getAllByLabelText(/^Enunciado/)).toHaveLength(1),
    );
    expect(screen.getByLabelText("Enunciado de la pregunta 1")).toHaveValue(
      "segunda",
    );
  });

  it("blocks submit with zero questions", async () => {
    const onSubmit = setup();
    type("Título", "T");

    click("Guardar test");

    expect(
      await screen.findByText("Agrega al menos una pregunta"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit with a question that has one option", async () => {
    const onSubmit = setup({
      defaultValues: {
        titulo: "T",
        descripcion: "",
        preguntas: [
          { enunciado: "q", opciones: [{ texto: "a" }], correctaIndex: 0 },
        ],
      },
    });

    click("Guardar test");

    expect(
      await screen.findByText("Agrega al menos 2 opciones"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit when no option is marked and reports empty fields", async () => {
    const onSubmit = setup();
    await agregarPregunta();

    click("Guardar test");

    expect(
      await screen.findByText("Marca una opción correcta"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El título no puede estar vacío"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El enunciado no puede estar vacío"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("La opción no puede estar vacía")).toHaveLength(
      2,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the nested payload with numeric correct flags", async () => {
    const onSubmit = setup();
    type("Título", "Parcial");
    type("Descripción (opcional)", "  ");
    click("Agregar pregunta");
    await screen.findByText("Pregunta 1");
    click("Agregar pregunta");
    await screen.findByText("Pregunta 2");
    const [, agregarOpcion] = screen.getAllByRole("button", {
      name: "Agregar opción",
    });
    fireEvent.click(agregarOpcion);
    type("Enunciado de la pregunta 1", "uno");
    type("Opción 1 de la pregunta 1", "a");
    type("Opción 2 de la pregunta 1", "b");
    fireEvent.click(radio("Marcar la opción 2 de la pregunta 1 como correcta"));
    type("Enunciado de la pregunta 2", "dos");
    type("Opción 1 de la pregunta 2", "x");
    type("Opción 2 de la pregunta 2", "y");
    type("Opción 3 de la pregunta 2", "z");
    fireEvent.click(radio("Marcar la opción 3 de la pregunta 2 como correcta"));

    click("Guardar test");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      materia_id: "m1",
      titulo: "Parcial",
      descripcion: null,
      preguntas: [
        {
          enunciado: "uno",
          opciones: [
            { texto: "a", es_correcta: false },
            { texto: "b", es_correcta: true },
          ],
        },
        {
          enunciado: "dos",
          opciones: [
            { texto: "x", es_correcta: false },
            { texto: "y", es_correcta: false },
            { texto: "z", es_correcta: true },
          ],
        },
      ],
    });
  });

  it("shows the submit error and keeps the form", async () => {
    const onSubmit = setup({ submitLabel: "Crear" });
    onSubmit.mockRejectedValueOnce(new Error("API request failed: 500"));
    type("Título", "T");
    click("Agregar pregunta");
    await screen.findByText("Pregunta 1");
    type("Enunciado de la pregunta 1", "q");
    type("Opción 1 de la pregunta 1", "a");
    type("Opción 2 de la pregunta 1", "b");
    fireEvent.click(radio("Marcar la opción 1 de la pregunta 1 como correcta"));

    click("Crear");

    expect(
      await screen.findByText("API request failed: 500"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("T");
    expect(screen.getByRole("button", { name: "Crear" })).toBeEnabled();
  });

  it("falls back to a generic message for non-Error rejections", async () => {
    const onSubmit = setup();
    onSubmit.mockRejectedValueOnce("boom");
    type("Título", "T");
    click("Agregar pregunta");
    await screen.findByText("Pregunta 1");
    type("Enunciado de la pregunta 1", "q");
    type("Opción 1 de la pregunta 1", "a");
    type("Opción 2 de la pregunta 1", "b");
    fireEvent.click(radio("Marcar la opción 2 de la pregunta 1 como correcta"));

    click("Guardar test");

    expect(await screen.findByText("No se pudo guardar.")).toBeInTheDocument();
  });
});

const TEST: Test = {
  id: "t1",
  materia_id: "m1",
  titulo: "Existente",
  descripcion: null,
  autor_id: "u1",
  origen: "manual",
  created_at: "2026-11-07T00:00:00Z",
  preguntas: [
    {
      id: "p1",
      enunciado: "¿Q?",
      orden: 0,
      opciones: [
        { id: "o1", texto: "a", orden: 0, es_correcta: false },
        { id: "o2", texto: "b", orden: 1, es_correcta: true },
      ],
    },
    {
      id: "p2",
      enunciado: "sin marca",
      orden: 1,
      opciones: [
        { id: "o3", texto: "c", orden: 0 },
        { id: "o4", texto: "d", orden: 1 },
      ],
    },
  ],
};

describe("edit mode", () => {
  it("prechecks the stored correct option", () => {
    setup({ defaultValues: toFormValues(TEST) });

    expect(screen.getByLabelText("Título")).toHaveValue("Existente");
    expect(
      radio("Marcar la opción 2 de la pregunta 1 como correcta").checked,
    ).toBe(true);
    expect(
      radio("Marcar la opción 1 de la pregunta 1 como correcta").checked,
    ).toBe(false);
  });

  it("maps missing es_correcta to nothing marked", () => {
    expect(toFormValues(TEST).preguntas[1].correctaIndex).toBeNull();
    expect(toFormValues(TEST).preguntas[0].correctaIndex).toBe(1);
  });
});
