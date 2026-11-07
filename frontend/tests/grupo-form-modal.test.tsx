import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GrupoFormModal } from "../components/grupos/grupo-form-modal";
import { apiFetchClient } from "../lib/api-client";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;

const CALCULO = {
  id: "m1",
  nombre: "Cálculo",
  nombre_normalizado: "calculo",
  created_by: "u1",
};

beforeEach(() => {
  api.mockReset();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function openCombobox(query?: string) {
  fireEvent.click(screen.getByRole("button", { name: /seleccionar materia/i }));
  const input = await screen.findByPlaceholderText(/buscar materia/i);
  if (query !== undefined)
    fireEvent.change(input, { target: { value: query } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
}

describe("GrupoFormModal", () => {
  it("requires a name and a materia", async () => {
    const onSubmit = vi.fn();
    render(<GrupoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(
      await screen.findByText(/selecciona una materia/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the name error when the name is empty but the materia is valid", async () => {
    api.mockResolvedValue([CALCULO]);
    const onSubmit = vi.fn();
    render(<GrupoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    await openCombobox();
    fireEvent.click(await screen.findByText("Cálculo"));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText(/escribe un nombre/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects names longer than 120 characters", async () => {
    api.mockResolvedValue([CALCULO]);
    const onSubmit = vi.fn();
    render(<GrupoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "x".repeat(121) },
    });
    await openCombobox();
    fireEvent.click(await screen.findByText("Cálculo"));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /guardar/i })).toBeEnabled();
  });

  it("clears the materia error once a materia is picked", async () => {
    api.mockResolvedValue([CALCULO]);
    render(<GrupoFormModal onSubmit={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    expect(
      await screen.findByText(/selecciona una materia/i),
    ).toBeInTheDocument();
    await openCombobox();
    fireEvent.click(await screen.findByText("Cálculo"));

    await waitFor(() =>
      expect(
        screen.queryByText(/selecciona una materia/i),
      ).not.toBeInTheDocument(),
    );
  });

  it("loads recent materias on open and submits the selected one", async () => {
    api.mockResolvedValue([CALCULO]);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<GrupoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Estudio" },
    });
    await openCombobox();
    expect(api).toHaveBeenCalledWith("/api/materias");
    fireEvent.click(await screen.findByText("Cálculo"));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        nombre: "Estudio",
        materia_id: "m1",
      }),
    );
  });

  it("searches with a debounced query and offers to create a new materia", async () => {
    api.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    render(<GrupoFormModal onSubmit={vi.fn()} onClose={vi.fn()} />);

    await openCombobox("Álgebra");

    expect(api).toHaveBeenCalledWith("/api/materias?q=%C3%81lgebra");
    expect(await screen.findByText(/crear materia/i)).toBeInTheDocument();
  });

  it("creates the materia on demand and uses its id", async () => {
    api.mockImplementation(async (_path: string, opts?: { method?: string }) =>
      opts?.method === "POST"
        ? { ...CALCULO, id: "m9", nombre: "Álgebra" }
        : [],
    );
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<GrupoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "G" },
    });
    await openCombobox("Álgebra");
    fireEvent.click(await screen.findByText(/crear materia/i));

    expect(
      await screen.findByRole("button", { name: "Álgebra" }),
    ).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/api/materias", {
      method: "POST",
      body: { nombre: "Álgebra" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ nombre: "G", materia_id: "m9" }),
    );
  });

  it("does not offer to create when an exact match exists", async () => {
    api.mockResolvedValue([CALCULO]);
    render(<GrupoFormModal onSubmit={vi.fn()} onClose={vi.fn()} />);

    await openCombobox("cálculo");

    await screen.findByText("Cálculo");
    expect(screen.queryByText(/crear materia/i)).not.toBeInTheDocument();
  });

  it("shows an error when creating the materia fails", async () => {
    api.mockImplementation(async (_p: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") throw new Error("API request failed: 500");
      return [];
    });
    render(<GrupoFormModal onSubmit={vi.fn()} onClose={vi.fn()} />);

    await openCombobox("Nueva");
    fireEvent.click(await screen.findByText(/crear materia/i));

    expect(await screen.findByText(/failed: 500/)).toBeInTheDocument();
  });

  it("falls back to a generic message for non-Error failures creating a materia", async () => {
    api.mockImplementation(async (_p: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") throw "boom";
      return [];
    });
    render(<GrupoFormModal onSubmit={vi.fn()} onClose={vi.fn()} />);

    await openCombobox("Nueva");
    fireEvent.click(await screen.findByText(/crear materia/i));

    expect(
      await screen.findByText(/no se pudo crear la materia/i),
    ).toBeInTheDocument();
  });

  it("clears the options when the search request fails", async () => {
    api.mockRejectedValue(new Error("down"));
    render(<GrupoFormModal onSubmit={vi.fn()} onClose={vi.fn()} />);

    await openCombobox();

    expect(await screen.findByText(/sin resultados/i)).toBeInTheDocument();
  });

  it("shows submit errors and re-enables the button", async () => {
    api.mockResolvedValue([CALCULO]);
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<GrupoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "G" },
    });
    await openCombobox();
    fireEvent.click(await screen.findByText("Cálculo"));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar/i })).toBeEnabled();
  });

  it("uses a generic message when the submit rejection is not an Error", async () => {
    api.mockResolvedValue([CALCULO]);
    const onSubmit = vi.fn().mockRejectedValue("boom");
    render(<GrupoFormModal onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "G" },
    });
    await openCombobox();
    fireEvent.click(await screen.findByText("Cálculo"));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText(/no se pudo guardar/i)).toBeInTheDocument();
  });

  it("edits only the name when given a grupo", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <GrupoFormModal
        grupo={{
          id: "g1",
          nombre: "Viejo",
          materia_id: "m1",
          materia_nombre: "Cálculo",
          owner_id: "u1",
          codigo_invitacion: "ABC234",
        }}
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue("Viejo");
    expect(screen.queryByText(/seleccionar materia/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Nuevo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        nombre: "Nuevo",
        materia_id: "m1",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
