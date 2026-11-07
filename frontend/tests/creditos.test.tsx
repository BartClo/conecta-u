import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreditosClient } from "../app/(app)/creditos/creditos-client";
import CreditosError from "../app/(app)/creditos/error";
import { SaldoContador } from "../components/creditos/saldo-contador";
import { apiFetchClient } from "../lib/api-client";
import { MOTIVO_CREDITO_LABEL, MOTIVOS_CREDITO } from "../lib/motivosCredito";
import type { MovimientoCreditoOut } from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));

const stop = vi.fn();
vi.mock("framer-motion", async (orig) => ({
  ...(await orig<typeof import("framer-motion")>()),
  animate: vi.fn(
    (_from: number, to: number, opts: { onUpdate: (v: number) => void }) => {
      opts.onUpdate(to + 0.4);
      return { stop };
    },
  ),
}));

function stubReduced(matches: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function mov(
  id: string,
  delta: number,
  motivo: MovimientoCreditoOut["motivo"],
  saldo_resultante: number,
): MovimientoCreditoOut {
  return {
    id,
    delta,
    motivo,
    ref_tipo: null,
    ref_id: null,
    saldo_resultante,
    created_at: "2026-03-05T12:00:00Z",
  };
}

function renderClient(
  items: MovimientoCreditoOut[],
  total = items.length,
  saldo = 100,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CreditosClient
        initialSaldo={{ saldo }}
        initialMovimientos={{ items, limit: 20, offset: 0, total }}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  stubReduced(true);
  stop.mockClear();
  (apiFetchClient as ReturnType<typeof vi.fn>).mockReset();
});

describe("MOTIVO_CREDITO_LABEL", () => {
  it("has a label for every motivo", () => {
    MOTIVOS_CREDITO.forEach((m) =>
      expect(MOTIVO_CREDITO_LABEL[m]).toBeTruthy(),
    );
    expect(Object.keys(MOTIVO_CREDITO_LABEL).sort()).toEqual(
      [...MOTIVOS_CREDITO].sort(),
    );
  });
});

describe("SaldoContador", () => {
  it("renders the final value directly with reduced motion", () => {
    render(<SaldoContador valor={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("animates from the previous value, rounds, and stops on unmount", async () => {
    stubReduced(false);
    const { rerender, unmount } = render(<SaldoContador valor={10} />);
    expect(await screen.findByText("10")).toBeInTheDocument();
    rerender(<SaldoContador valor={30} />);
    expect(await screen.findByText("30")).toBeInTheDocument();
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});

describe("CreditosClient", () => {
  it("renders movimientos with label, signed colored delta and saldo", () => {
    renderClient(
      [mov("a", 15, "gano_desafio", 115), mov("b", -20, "genero_test_ia", 95)],
      2,
      95,
    );

    expect(screen.getByText("Ganaste un desafío")).toBeInTheDocument();
    expect(screen.getByText("Generaste un test con IA")).toBeInTheDocument();
    expect(screen.getByText("+15")).toHaveClass("text-green-600");
    expect(screen.getByText("-20")).toHaveClass("text-red-600");
    expect(screen.getByText("Saldo: 115")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument(); // big saldo
  });

  it("shows the welcome message when only the bono exists", () => {
    renderClient([mov("a", 100, "bono_inicial", 100)]);
    expect(
      screen.getByText(
        /Todavía no has ganado ni gastado créditos\. Empezaste con tu bono/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Bono de bienvenida")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cargar más/i })).toBeNull();
  });

  it("shows the empty message without mentioning the bono when total is 0", () => {
    renderClient([], 0, 0);
    expect(screen.getByText(/Todavía no has ganado/)).toBeInTheDocument();
    expect(screen.queryByText(/bono/)).not.toBeInTheDocument();
  });

  it("loads more with offset=20, appends, shows skeleton, then disables", async () => {
    renderClient([mov("a", 15, "gano_desafio", 115)], 2);
    let resolve!: (v: unknown) => void;
    (apiFetchClient as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((r) => (resolve = r)),
    );

    fireEvent.click(screen.getByRole("button", { name: /cargar más/i }));
    expect(await screen.findAllByTestId("movimiento-skeleton")).toHaveLength(3);
    resolve({
      items: [mov("b", -20, "genero_resumen_ia", 95)],
      limit: 20,
      offset: 20,
      total: 2,
    });

    expect(
      await screen.findByText("Generaste un resumen con IA"),
    ).toBeInTheDocument();
    expect(apiFetchClient).toHaveBeenCalledWith(
      "/api/creditos/movimientos?limit=20&offset=20",
    );
    expect(screen.getByText("Ganaste un desafío")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cargar más/i })).toBeDisabled();
    expect(screen.queryByTestId("movimiento-skeleton")).toBeNull();
  });

  it("shows an inline error when loading more fails and keeps the list", async () => {
    renderClient([mov("a", 15, "gano_desafio", 115)], 2);
    (apiFetchClient as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API request failed: 500"),
    );

    fireEvent.click(screen.getByRole("button", { name: /cargar más/i }));

    expect(
      await screen.findByText("Error del servidor. Intenta de nuevo."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ganaste un desafío")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cargar más/i })).toBeEnabled(),
    );
  });
});

describe("CreditosError", () => {
  it("offers a retry that calls reset", () => {
    const reset = vi.fn();
    render(<CreditosError reset={reset} />);
    expect(
      screen.getByText("No se pudo cargar tu billetera."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reset).toHaveBeenCalled();
  });
});
