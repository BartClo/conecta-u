import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GruposClient } from "../app/(app)/grupos/grupos-client";
import { apiFetchClient } from "../lib/api-client";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;

const GRUPO = {
  id: "g1",
  nombre: "Estudio",
  materia_id: "m1",
  materia_nombre: "Cálculo",
  owner_id: "u1",
  codigo_invitacion: "ABC234",
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
});

afterEach(() => vi.unstubAllGlobals());

describe("GruposClient", () => {
  it("lists grupos with their materia and a link to the detail", () => {
    render(<GruposClient initialGrupos={[GRUPO]} />);

    expect(screen.getByText("Estudio")).toBeInTheDocument();
    expect(screen.getByText("Cálculo")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/grupos/g1");
    expect(screen.queryByText("ABC234")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no grupos", () => {
    render(<GruposClient initialGrupos={[]} />);

    expect(screen.getByText(/todav.a no perteneces/i)).toBeInTheDocument();
  });

  it("creates a grupo and shows it in the list", async () => {
    api.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === "/api/materias" && !opts)
        return [{ id: "m1", nombre: "Cálculo" }];
      return { ...GRUPO, id: "g2", nombre: "Nuevo grupo" };
    });
    render(<GruposClient initialGrupos={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /crear grupo/i }));
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Nuevo grupo" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /seleccionar materia/i }),
    );
    fireEvent.click(await screen.findByText("Cálculo"));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(screen.getByRole("link")).toHaveAttribute("href", "/grupos/g2"),
    );
    expect(api).toHaveBeenCalledWith("/api/grupos", {
      method: "POST",
      body: { nombre: "Nuevo grupo", materia_id: "m1" },
    });
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });

  it("joins a grupo with a code", async () => {
    api.mockResolvedValue(GRUPO);
    render(<GruposClient initialGrupos={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /unirse con c.digo/i }));
    fireEvent.change(screen.getByLabelText(/c.digo/i), {
      target: { value: "abc234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unirse$/i }));

    await waitFor(() =>
      expect(screen.getByText("Estudio")).toBeInTheDocument(),
    );
    expect(api).toHaveBeenCalledWith("/api/grupos/unirse", {
      method: "POST",
      body: { codigo: "ABC234" },
    });
  });

  it("puts a newly joined grupo first in the list", async () => {
    api.mockResolvedValue({ ...GRUPO, id: "g2", nombre: "Nuevo" });
    render(<GruposClient initialGrupos={[GRUPO]} />);

    fireEvent.click(screen.getByRole("button", { name: /unirse con c.digo/i }));
    fireEvent.change(screen.getByLabelText(/c.digo/i), {
      target: { value: "abc234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unirse$/i }));

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/grupos/g2",
    );
  });

  it.each([
    [404, /inv.lido o inexistente/i],
    [409, /ya eres miembro/i],
  ])("shows the message for a %i when joining", async (status, expected) => {
    api.mockRejectedValue(new Error(`API request failed: ${status}`));
    render(<GruposClient initialGrupos={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /unirse con c.digo/i }));
    fireEvent.change(screen.getByLabelText(/c.digo/i), {
      target: { value: "ZZZZZZ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unirse$/i }));

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.getByText(/todav.a no perteneces/i)).toBeInTheDocument();
  });

  it("closes both modals without submitting", () => {
    render(<GruposClient initialGrupos={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /crear grupo/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /unirse con c.digo/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByLabelText(/c.digo/i)).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});
