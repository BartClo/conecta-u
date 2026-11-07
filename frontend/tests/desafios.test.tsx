import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesafiosClient } from "../app/(app)/grupos/[id]/desafios/desafios-client";
import { RendirClient } from "../app/(app)/grupos/[id]/desafios/[desafioId]/rendir-client";
import { ResultadoClient } from "../app/(app)/grupos/[id]/desafios/[desafioId]/resultado-client";
import { DesafioCard } from "../components/desafios/desafio-card";
import { apiFetchClient } from "../lib/api-client";
import { formatoTiempo, puedeRendirse } from "../lib/desafios";
import type {
  DesafioOut,
  IntentoOut,
  ResultadoDesafioOut,
  TestParaRendir,
} from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;

const ABIERTO: DesafioOut = {
  id: "d1",
  grupo_id: "g1",
  test_id: "t1",
  test_titulo: "Parcial 1",
  creado_por: "u1",
  fecha_inicio: "2020-01-01T00:00:00Z",
  fecha_fin: null,
  estado: "abierto",
  ya_rindio: false,
};

const TEST: TestParaRendir = {
  id: "t1",
  titulo: "Parcial 1",
  preguntas: [
    {
      id: "p1",
      enunciado: "¿2+2?",
      orden: 0,
      opciones: [
        { id: "o1", texto: "3", orden: 0 },
        { id: "o2", texto: "4", orden: 1 },
      ],
    },
    {
      id: "p2",
      enunciado: "¿3+3?",
      orden: 1,
      opciones: [
        { id: "o3", texto: "6", orden: 0 },
        { id: "o4", texto: "7", orden: 1 },
      ],
    },
  ],
};

const INTENTO: IntentoOut = {
  id: "i1",
  desafio_id: "d1",
  user_id: "u1",
  puntaje: 1,
  total: 2,
  segundos: 134,
  finalizado_at: "2026-11-07T00:00:00Z",
};

const RESULTADOS: ResultadoDesafioOut[] = [
  {
    user_id: "u2",
    user_nombre: "Beto",
    puntaje: 2,
    total: 2,
    segundos: 90,
    finalizado_at: "2026-11-07T00:00:00Z",
  },
  {
    user_id: "u1",
    user_nombre: "Ana",
    puntaje: 1,
    total: 2,
    segundos: 134,
    finalizado_at: "2026-11-07T00:00:00Z",
  },
];

beforeEach(() => {
  api.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("lib/desafios", () => {
  it("formats mm:ss", () => {
    expect(formatoTiempo(0)).toBe("00:00");
    expect(formatoTiempo(134)).toBe("02:14");
  });

  it("puedeRendirse respects estado and window", () => {
    const ahora = Date.parse("2026-06-01T00:00:00Z");
    expect(puedeRendirse(ABIERTO, ahora)).toBe(true);
    expect(puedeRendirse({ ...ABIERTO, estado: "cerrado" }, ahora)).toBe(false);
    expect(
      puedeRendirse(
        { ...ABIERTO, fecha_inicio: "2027-01-01T00:00:00Z" },
        ahora,
      ),
    ).toBe(false);
    expect(
      puedeRendirse({ ...ABIERTO, fecha_fin: "2026-01-01T00:00:00Z" }, ahora),
    ).toBe(false);
    expect(
      puedeRendirse({ ...ABIERTO, fecha_fin: "2027-01-01T00:00:00Z" }, ahora),
    ).toBe(true);
    expect(puedeRendirse(ABIERTO)).toBe(true);
  });
});

describe("DesafioCard", () => {
  it("shows Rendir for an open, unplayed desafio", () => {
    render(<DesafioCard desafio={ABIERTO} />);
    expect(screen.getByText("abierto")).toBeInTheDocument();
    expect(screen.getByText(/sin límite/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rendir" })).toHaveAttribute(
      "href",
      "/grupos/g1/desafios/d1",
    );
  });

  it("renders stable placeholders before mount and no Rendir link", () => {
    const html = renderToString(<DesafioCard desafio={ABIERTO} />);
    expect(html).toContain("…");
    expect(html).not.toContain("Rendir");
    expect(html).toContain("Cerrado");
  });

  it("shows the end date when there is one", () => {
    render(
      <DesafioCard
        desafio={{ ...ABIERTO, fecha_fin: "2099-01-01T00:00:00Z" }}
      />,
    );
    expect(screen.queryByText(/sin límite/)).not.toBeInTheDocument();
  });

  it("shows Ver resultado when already played, even if closed", () => {
    render(
      <DesafioCard
        desafio={{ ...ABIERTO, estado: "cerrado", ya_rindio: true }}
      />,
    );
    expect(screen.getByText("cerrado")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver resultado" }),
    ).toBeInTheDocument();
  });

  it("shows a disabled Cerrado when closed or out of window", () => {
    render(<DesafioCard desafio={{ ...ABIERTO, estado: "cerrado" }} />);
    expect(screen.getByText("Cerrado")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("DesafiosClient", () => {
  const tests = [{ id: "t1", titulo: "Parcial 1" }];

  it("shows the empty state", () => {
    render(
      <DesafiosClient
        grupoId="g1"
        initialDesafios={[]}
        testsDisponibles={tests}
      />,
    );
    expect(screen.getByText(/Aún no hay desafíos/)).toBeInTheDocument();
  });

  it("creates a desafio omitting empty dates and prepends it", async () => {
    api.mockResolvedValueOnce({ ...ABIERTO, id: "d2", test_titulo: "Nuevo" });
    render(
      <DesafiosClient
        grupoId="g1"
        initialDesafios={[ABIERTO]}
        testsDisponibles={tests}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo desafío" }));
    fireEvent.change(screen.getByLabelText("Test"), {
      target: { value: "t1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(screen.getByText("Nuevo")).toBeInTheDocument());
    expect(api).toHaveBeenCalledWith("/api/grupos/g1/desafios", {
      method: "POST",
      body: { test_id: "t1" },
    });
    expect(screen.queryByRole("button", { name: "Crear" })).toBeNull();
    const titulos = screen.getAllByRole("heading", { level: 3 });
    expect(titulos.map((h) => h.textContent)).toEqual(["Nuevo", "Parcial 1"]);
  });

  it("sends dates as ISO instants when filled", async () => {
    api.mockResolvedValueOnce({ ...ABIERTO, id: "d2" });
    render(
      <DesafiosClient
        grupoId="g1"
        initialDesafios={[]}
        testsDisponibles={tests}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo desafío" }));
    fireEvent.change(screen.getByLabelText("Test"), {
      target: { value: "t1" },
    });
    fireEvent.change(screen.getByLabelText("Inicio (opcional)"), {
      target: { value: "2026-11-07T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Fin (opcional)"), {
      target: { value: "2026-11-08T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(api).toHaveBeenCalled());
    const body = api.mock.calls[0][1].body;
    expect(body.fecha_inicio).toBe(new Date("2026-11-07T10:00").toISOString());
    expect(body.fecha_fin).toBe(new Date("2026-11-08T10:00").toISOString());
  });

  it("validates test selection and date order before calling the API", () => {
    render(
      <DesafiosClient
        grupoId="g1"
        initialDesafios={[]}
        testsDisponibles={tests}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo desafío" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(screen.getByText("Selecciona un test.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Test"), {
      target: { value: "t1" },
    });
    fireEvent.change(screen.getByLabelText("Inicio (opcional)"), {
      target: { value: "2026-11-08T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Fin (opcional)"), {
      target: { value: "2026-11-07T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(screen.getByText(/no puede ser anterior/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("shows the API error and re-enables the form", async () => {
    api.mockRejectedValueOnce(new Error("API request failed: 409"));
    render(
      <DesafiosClient
        grupoId="g1"
        initialDesafios={[]}
        testsDisponibles={tests}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo desafío" }));
    fireEvent.change(screen.getByLabelText("Test"), {
      target: { value: "t1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(await screen.findByText(/Error del servidor/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear" })).toBeEnabled();
  });

  it("blocks creation when the materia has no tests, and can cancel", () => {
    render(
      <DesafiosClient
        grupoId="g1"
        initialDesafios={[]}
        testsDisponibles={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo desafío" }));
    expect(screen.getByText(/aún no tiene tests/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText(/aún no tiene tests/)).toBeNull();
  });
});

describe("ResultadoClient", () => {
  it("shows own score and time, highlights own row and keeps backend order", () => {
    render(
      <ResultadoClient
        grupoId="g1"
        miIntento={INTENTO}
        resultados={RESULTADOS}
      />,
    );
    expect(screen.getByText("Tu puntaje: 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("en 02:14")).toBeInTheDocument();
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas.map((f) => f.textContent)).toEqual([
      "Beto2 / 201:30",
      "Ana1 / 202:14",
    ]);
    expect(filas[0]).toHaveAttribute("data-mia", "false");
    expect(filas[1]).toHaveAttribute("data-mia", "true");
    expect(
      screen.getByRole("link", { name: "Volver a desafíos" }),
    ).toHaveAttribute("href", "/grupos/g1/desafios");
  });

  it("without resultados renders no table and shows its children", () => {
    render(
      <ResultadoClient grupoId="g1" miIntento={INTENTO}>
        <p>EXTRA</p>
      </ResultadoClient>,
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("EXTRA")).toBeInTheDocument();
  });

  it("celebrates only when just played with a perfect score", () => {
    const perfecto = { ...INTENTO, puntaje: 2 };
    const { rerender } = render(
      <ResultadoClient grupoId="g1" miIntento={perfecto} resultados={[]} />,
    );
    expect(screen.queryByText(/Perfecto/)).toBeNull();
    rerender(
      <ResultadoClient
        grupoId="g1"
        miIntento={perfecto}
        resultados={[]}
        recienRendido
      />,
    );
    expect(screen.getByText(/Perfecto/)).toBeInTheDocument();
    rerender(
      <ResultadoClient
        grupoId="g1"
        miIntento={INTENTO}
        resultados={[]}
        recienRendido
      />,
    );
    expect(screen.queryByText(/Perfecto/)).toBeNull();
  });
});

describe("RendirClient", () => {
  function setup() {
    return render(<RendirClient grupoId="g1" desafioId="d1" test={TEST} />);
  }

  async function responderTodo() {
    fireEvent.click(screen.getByLabelText("4"));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(await screen.findByLabelText("6"));
  }

  it("never renders correctness hints", () => {
    const { container } = setup();
    expect(container.innerHTML).not.toMatch(/es_correcta|correct/i);
  });

  it("stores answers, navigates and keeps previous answers", async () => {
    setup();
    expect(screen.getByText("Pregunta 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(
      screen.getByText("Faltan 2 preguntas por responder."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("4"));
    expect(screen.getByLabelText("4")).toBeChecked();
    expect(
      screen.getByText("Falta 1 pregunta por responder."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("¿3+3?")).toBeInTheDocument();
    expect(screen.getByText("Pregunta 2 de 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(await screen.findByLabelText("4")).toBeChecked();
  });

  it("jumps with the progress dots and tracks answered ones", async () => {
    setup();
    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.click(screen.getByLabelText("Ir a la pregunta 2"));
    expect(await screen.findByText("¿3+3?")).toBeInTheDocument();
    expect(screen.getByLabelText("Ir a la pregunta 1")).toHaveAttribute(
      "data-respondida",
      "true",
    );
    expect(screen.getByLabelText("Ir a la pregunta 2")).toHaveAttribute(
      "data-respondida",
      "false",
    );
    fireEvent.click(screen.getByLabelText("Ir a la pregunta 1"));
    expect(await screen.findByText("¿2+2?")).toBeInTheDocument();
  });

  it("disables Finalizar until everything is answered", async () => {
    setup();
    fireEvent.click(screen.getByLabelText("4"));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(
      await screen.findByRole("button", { name: "Finalizar" }),
    ).toBeDisabled();
    fireEvent.click(await screen.findByLabelText("6"));
    expect(screen.getByRole("button", { name: "Finalizar" })).toBeEnabled();
    expect(screen.queryByText(/por responder/)).toBeNull();
  });

  it("submits the well-formed payload and shows the result", async () => {
    api.mockResolvedValueOnce(INTENTO).mockResolvedValueOnce(RESULTADOS);
    setup();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(await screen.findByText("Tu puntaje: 1 / 2")).toBeInTheDocument();
    const [path, opts] = api.mock.calls[0];
    expect(path).toBe("/api/desafios/d1/intentos");
    expect(opts.method).toBe("POST");
    expect(typeof opts.body.segundos).toBe("number");
    expect(opts.body.respuestas).toEqual(
      expect.arrayContaining([
        { pregunta_id: "p1", opcion_id: "o2" },
        { pregunta_id: "p2", opcion_id: "o3" },
      ]),
    );
    expect(opts.body.respuestas).toHaveLength(2);
    expect(api.mock.calls[1][0]).toBe("/api/desafios/d1/resultados");
    expect(screen.getByText("Beto")).toBeInTheDocument();
  });

  it("still shows the result if loading the table fails", async () => {
    api
      .mockResolvedValueOnce(INTENTO)
      .mockRejectedValueOnce(new Error("API request failed: 500"));
    setup();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(await screen.findByText("Tu puntaje: 1 / 2")).toBeInTheDocument();
  });

  it("on 409 falls back to intentos/me + resultados instead of re-posting", async () => {
    api
      .mockRejectedValueOnce(new Error("API request failed: 409"))
      .mockResolvedValueOnce(INTENTO)
      .mockResolvedValueOnce(RESULTADOS);
    setup();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(await screen.findByText("Tu puntaje: 1 / 2")).toBeInTheDocument();
    expect(api.mock.calls.map((c) => c[0])).toEqual([
      "/api/desafios/d1/intentos",
      "/api/desafios/d1/intentos/me",
      "/api/desafios/d1/resultados",
    ]);
  });

  it("on 409 without own attempt says the desafio no longer accepts attempts", async () => {
    api
      .mockRejectedValueOnce(new Error("API request failed: 409"))
      .mockRejectedValueOnce(new Error("API request failed: 404"));
    setup();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText("Este desafío ya no acepta intentos"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Tu puntaje/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Volver a desafíos" }),
    ).toHaveAttribute("href", "/grupos/g1/desafios");
  });

  it("on 409 with a non-404 failure on intentos/me shows a retryable error", async () => {
    api
      .mockRejectedValueOnce(new Error("API request failed: 409"))
      .mockRejectedValueOnce(new Error("API request failed: 500"));
    setup();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(await screen.findByText(/Error del servidor/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("stops the timer once there is a final result", async () => {
    const clear = vi.spyOn(globalThis, "clearInterval");
    api.mockResolvedValueOnce(INTENTO).mockResolvedValueOnce(RESULTADOS);
    setup();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    await screen.findByText("Tu puntaje: 1 / 2");
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });

  it("on a generic error shows the message and Reintentar repeats the same POST", async () => {
    api
      .mockRejectedValueOnce(new Error("API request failed: 500"))
      .mockResolvedValueOnce(INTENTO)
      .mockResolvedValueOnce(RESULTADOS);
    setup();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(await screen.findByText(/Error del servidor/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Tu puntaje: 1 / 2")).toBeInTheDocument();
    expect(api.mock.calls[2][0]).toBe("/api/desafios/d1/resultados");
    expect(api.mock.calls[1][1].body.respuestas).toHaveLength(2);
  });

  it("does not fire two POSTs on a double click", async () => {
    let resolver!: (v: IntentoOut) => void;
    api
      .mockImplementationOnce(
        () => new Promise<IntentoOut>((res) => (resolver = res)),
      )
      .mockResolvedValueOnce(RESULTADOS);
    setup();
    await responderTodo();
    const boton = screen.getByRole("button", { name: "Finalizar" });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(
      await screen.findByRole("button", { name: "Enviando…" }),
    ).toBeDisabled();
    expect(api).toHaveBeenCalledTimes(1);
    await act(async () => resolver(INTENTO));
    expect(await screen.findByText("Tu puntaje: 1 / 2")).toBeInTheDocument();
  });

  it("timer display ticks and segundos comes from Date.now() - startedAt", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    vi.setSystemTime(new Date("2026-11-07T10:00:00Z"));
    const uno: TestParaRendir = { ...TEST, preguntas: [TEST.preguntas[0]] };
    api.mockResolvedValueOnce(INTENTO).mockResolvedValueOnce(RESULTADOS);
    render(<RendirClient grupoId="g1" desafioId="d1" test={uno} />);
    expect(screen.getByLabelText("Tiempo transcurrido")).toHaveTextContent(
      "00:00",
    );

    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });
    expect(screen.getByLabelText("Tiempo transcurrido")).toHaveTextContent(
      "01:05",
    );

    fireEvent.click(screen.getByLabelText("4"));
    // Move the clock without ticking the interval: only Date.now() changes.
    vi.setSystemTime(new Date("2026-11-07T10:10:00Z"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    });
    expect(api.mock.calls[0][1].body.segundos).toBe(600);
  });
});
