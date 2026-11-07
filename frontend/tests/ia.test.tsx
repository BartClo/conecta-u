import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumenDetalleClient } from "../app/(app)/ia/resumenes/[id]/resumen-detalle-client";
import { ResumenNuevoClient } from "../app/(app)/ia/resumenes/nuevo/resumen-nuevo-client";
import { ResumenesClient } from "../app/(app)/ia/resumenes/resumenes-client";
import { TestIaClient } from "../app/(app)/materias/[materiaId]/tests/nuevo-ia/test-ia-client";
import { CostoBadge } from "../components/ia/costo-badge";
import { GenerandoOverlay } from "../components/ia/generando-overlay";
import { apiFetchClient } from "../lib/api-client";
import { useSaldo } from "../lib/hooks/use-saldo";
import { mensajeGeneracion } from "../lib/ia-error";
import type { Resumen } from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
vi.mock("../lib/hooks/use-saldo", () => ({ useSaldo: vi.fn() }));
// Exit animations never finish under fake timers; render the swap directly.
vi.mock("framer-motion", async (orig) => ({
  ...(await orig<typeof import("framer-motion")>()),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;
const saldoMock = useSaldo as ReturnType<typeof vi.fn>;

const RESUMEN: Resumen = {
  id: "r1",
  user_id: "u1",
  materia_id: null,
  titulo: "Mi resumen",
  contenido_fuente: "texto original",
  contenido_resumen: "el resumen generado",
  created_at: "2026-11-07T00:00:00Z",
};
const TEXTO_LARGO = "a".repeat(60);

function stubReduced(matches: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function setSaldo(saldo: number | undefined) {
  saldoMock.mockReturnValue({
    data: saldo === undefined ? undefined : { saldo },
  });
}

let client: QueryClient;
function renderWith(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  api.mockReset();
  push.mockReset();
  stubReduced(true);
  setSaldo(100);
  client = new QueryClient();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CostoBadge", () => {
  it("shows cost and balance when affordable", () => {
    render(<CostoBadge costo={20} saldo={100} />);
    const p = screen.getByText("Cuesta 20 créditos — tienes 100.");
    expect(p).not.toHaveClass("text-destructive");
  });

  it("warns when the balance is short", () => {
    render(<CostoBadge costo={20} saldo={5} />);
    expect(screen.getByText(/No tienes créditos suficientes/)).toHaveClass(
      "text-destructive",
    );
  });

  it("shows only the cost while the balance loads", () => {
    render(<CostoBadge costo={20} />);
    expect(screen.getByText("Cuesta 20 créditos")).toBeInTheDocument();
  });
});

describe("mensajeGeneracion", () => {
  it("maps 402, 502 and the rest", () => {
    expect(
      mensajeGeneracion(new Error("API request failed: 402"), "test"),
    ).toMatch(/No tienes créditos suficientes para generar este test/);
    expect(
      mensajeGeneracion(new Error("API request failed: 502"), "resumen"),
    ).toMatch(/No se pudo generar.*No se te cobraron créditos/);
    expect(
      mensajeGeneracion(new Error("API request failed: 422"), "test"),
    ).toMatch(/no son válidos/);
    expect(mensajeGeneracion("x", "test")).toBe("No se pudo generar el test.");
  });
});

describe("GenerandoOverlay", () => {
  it("rotates the messages and stops at the last one", () => {
    stubReduced(false);
    vi.useFakeTimers();
    render(<GenerandoOverlay tipo="test" />);
    expect(
      screen.getByText("Pensando en buenas preguntas..."),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByText("Armando las opciones...")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2500 * 5);
    });
    expect(screen.getByText("Casi listo...")).toBeInTheDocument();
  });

  it("uses the resumen messages and swaps text without fading when reduced", () => {
    vi.useFakeTimers();
    render(<GenerandoOverlay tipo="resumen" />);
    expect(screen.getByText("Leyendo el texto...")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(
      screen.getByText("Identificando las ideas clave..."),
    ).toBeInTheDocument();
  });
});

describe("TestIaClient", () => {
  function fill(tema = "Cinemática") {
    fireEvent.change(screen.getByLabelText("Tema o temario"), {
      target: { value: tema },
    });
  }

  it("disables submit and never calls the API when the balance is short", () => {
    setSaldo(5);
    renderWith(<TestIaClient materiaId="m1" />);
    fill();
    const btn = screen.getByRole("button", { name: "Generar test" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(api).not.toHaveBeenCalled();
  });

  it("stays enabled while the balance is unknown", () => {
    setSaldo(undefined);
    renderWith(<TestIaClient materiaId="m1" />);
    expect(screen.getByRole("button", { name: "Generar test" })).toBeEnabled();
  });

  it("validates tema and n_preguntas without calling the API", async () => {
    renderWith(<TestIaClient materiaId="m1" />);
    fireEvent.change(screen.getByLabelText("Cantidad de preguntas"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generar test" }));
    expect(
      await screen.findByText("Describe el tema o temario."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Indica la cantidad de preguntas."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cantidad de preguntas"), {
      target: { value: "21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generar test" }));
    expect(await screen.findByText("Máximo 20 preguntas.")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("posts the payload, invalidates creditos and navigates to the test", async () => {
    const spy = vi.spyOn(client, "invalidateQueries");
    api.mockResolvedValue({
      test: { id: "t9" },
      costo_creditos: 20,
      saldo_restante: 80,
    });
    renderWith(<TestIaClient materiaId="m1" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generar test" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/materias/m1/tests/t9"),
    );
    expect(api).toHaveBeenCalledWith("/api/ia/tests", {
      method: "POST",
      body: { materia_id: "m1", tema: "Cinemática", n_preguntas: 10 },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["creditos"] });
  });

  it("includes texto_fuente when filled", async () => {
    api.mockResolvedValue({ test: { id: "t9" } });
    renderWith(<TestIaClient materiaId="m1" />);
    fill();
    fireEvent.change(screen.getByLabelText(/texto fuente/i), {
      target: { value: "mi texto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generar test" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(api.mock.calls[0][1].body.texto_fuente).toBe("mi texto");
  });

  it("shows the overlay and disables the inputs while pending", async () => {
    api.mockReturnValue(new Promise(() => {}));
    renderWith(<TestIaClient materiaId="m1" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generar test" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText("Tema o temario")).toBeDisabled();
  });

  it.each([
    [402, /No tienes créditos suficientes para generar este test/],
    [502, /No se pudo generar.*No se te cobraron créditos — intenta de nuevo/],
  ])(
    "shows the %i message, keeps the values and does not navigate",
    async (status, msg) => {
      const spy = vi.spyOn(client, "invalidateQueries");
      api.mockRejectedValue(new Error(`API request failed: ${status}`));
      renderWith(<TestIaClient materiaId="m1" />);
      fill();
      fireEvent.click(screen.getByRole("button", { name: "Generar test" }));

      expect(await screen.findByText(msg)).toBeInTheDocument();
      expect(spy).toHaveBeenCalledTimes(status === 402 ? 1 : 0);
      expect(push).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Tema o temario")).toHaveValue("Cinemática");
      expect(screen.getByLabelText("Tema o temario")).toBeEnabled();
    },
  );
});

describe("ResumenNuevoClient", () => {
  function fill(texto = TEXTO_LARGO) {
    fireEvent.change(screen.getByLabelText("Texto a resumir"), {
      target: { value: texto },
    });
  }

  it("blocks submit when the balance is short", () => {
    setSaldo(9);
    renderWith(<ResumenNuevoClient />);
    expect(
      screen.getByRole("button", { name: "Generar resumen" }),
    ).toBeDisabled();
    expect(api).not.toHaveBeenCalled();
  });

  it("stays enabled while the balance is unknown", () => {
    setSaldo(undefined);
    renderWith(<ResumenNuevoClient />);
    expect(
      screen.getByRole("button", { name: "Generar resumen" }),
    ).toBeEnabled();
  });

  it("rejects fewer than 50 characters without calling the API", async () => {
    renderWith(<ResumenNuevoClient />);
    fill("corto");
    fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
    expect(
      await screen.findByText("Pega al menos 50 caracteres de texto."),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("posts without titulo when empty, invalidates and navigates", async () => {
    const spy = vi.spyOn(client, "invalidateQueries");
    api.mockResolvedValue({
      resumen: { id: "r7" },
      costo_creditos: 10,
      saldo_restante: 90,
    });
    renderWith(<ResumenNuevoClient />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/ia/resumenes/r7"));
    expect(api).toHaveBeenCalledWith("/api/ia/resumenes", {
      method: "POST",
      body: { texto_fuente: TEXTO_LARGO },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["creditos"] });
  });

  it("sends the titulo when given", async () => {
    api.mockResolvedValue({ resumen: { id: "r7" } });
    renderWith(<ResumenNuevoClient />);
    fill();
    fireEvent.change(screen.getByLabelText(/Título/), {
      target: { value: "Mío" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(api.mock.calls[0][1].body).toEqual({
      texto_fuente: TEXTO_LARGO,
      titulo: "Mío",
    });
  });

  it("measures the minimum length on the trimmed text", async () => {
    renderWith(<ResumenNuevoClient />);
    fill(`${" ".repeat(60)}corto`);
    fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
    expect(
      await screen.findByText("Pega al menos 50 caracteres de texto."),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("shows the overlay while pending", async () => {
    api.mockReturnValue(new Promise(() => {}));
    renderWith(<ResumenNuevoClient />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText("Texto a resumir")).toBeDisabled();
  });

  it("validates the titulo length", async () => {
    renderWith(<ResumenNuevoClient />);
    fill();
    fireEvent.change(screen.getByLabelText(/Título/), {
      target: { value: "t".repeat(151) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
    expect(
      await screen.findByText("Máximo 150 caracteres."),
    ).toBeInTheDocument();
  });

  it.each([
    [402, /No tienes créditos suficientes para generar este resumen/],
    [502, /No se te cobraron créditos — intenta de nuevo/],
  ])("shows the %i message and keeps the text", async (status, msg) => {
    const spy = vi.spyOn(client, "invalidateQueries");
    api.mockRejectedValue(new Error(`API request failed: ${status}`));
    renderWith(<ResumenNuevoClient />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
    expect(await screen.findByText(msg)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(status === 402 ? 1 : 0);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Texto a resumir")).toHaveValue(TEXTO_LARGO);
  });
});

describe("ResumenesClient", () => {
  it("shows the empty state with the action", () => {
    render(<ResumenesClient resumenes={[]} />);
    expect(
      screen.getByText(/Todavía no has generado ningún resumen/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuevo resumen" })).toHaveAttribute(
      "href",
      "/ia/resumenes/nuevo",
    );
  });

  it("renders one card per resumen linking to the detail", () => {
    render(
      <ResumenesClient
        resumenes={[RESUMEN, { ...RESUMEN, id: "r2", titulo: "Otro" }]}
      />,
    );
    expect(screen.getByRole("link", { name: /Mi resumen/ })).toHaveAttribute(
      "href",
      "/ia/resumenes/r1",
    );
    expect(screen.getByText("Otro")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Nuevo resumen" })).toHaveLength(
      1,
    );
  });
});

describe("ResumenDetalleClient", () => {
  it("shows the summary and the collapsible original text", () => {
    render(<ResumenDetalleClient resumen={RESUMEN} />);
    expect(
      screen.getByRole("heading", { name: "Mi resumen" }),
    ).toBeInTheDocument();
    expect(screen.getByText("el resumen generado")).toBeInTheDocument();
    expect(screen.getByText("texto original")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver/ })).toHaveAttribute(
      "href",
      "/ia/resumenes",
    );
  });
});
