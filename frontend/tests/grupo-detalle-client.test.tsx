import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GrupoDetalleClient } from "../app/(app)/grupos/[id]/grupo-detalle-client";
import { apiFetchClient } from "../lib/api-client";
import type { GrupoDetalle, Miembro } from "../lib/types";

vi.mock("../lib/api-client", () => ({ apiFetchClient: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const api = apiFetchClient as ReturnType<typeof vi.fn>;

const GRUPO: GrupoDetalle = {
  id: "g1",
  nombre: "Estudio",
  materia_id: "m1",
  materia_nombre: "Cálculo",
  owner_id: "u1",
  codigo_invitacion: "ABC234",
  rol: "owner",
  miembros_count: 2,
};
const MIEMBROS: Miembro[] = [
  { user_id: "u1", nombre: "Ana", email: "ana@x.com", rol: "owner" },
  { user_id: "u2", nombre: null, email: "beto@x.com", rol: "member" },
];

function confirmWith(answer: boolean) {
  vi.spyOn(window, "confirm").mockReturnValue(answer);
}

beforeEach(() => {
  api.mockReset();
  push.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GrupoDetalleClient as owner", () => {
  function renderOwner() {
    return render(
      <GrupoDetalleClient grupo={GRUPO} miembros={MIEMBROS} userId="u1" />,
    );
  }

  it("shows the grupo, code, members, links and owner actions", () => {
    renderOwner();

    expect(screen.getByText("Estudio")).toBeInTheDocument();
    expect(screen.getByText("Cálculo")).toBeInTheDocument();
    expect(screen.getByText("ABC234")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("beto@x.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /tests de la materia/i }),
    ).toHaveAttribute("href", "/materias/m1/tests");
    expect(screen.getByRole("link", { name: /desaf/i })).toHaveAttribute(
      "href",
      "/grupos/g1/desafios",
    );
    expect(
      screen.getByRole("button", { name: /regenerar/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /expulsar/i })).toHaveLength(
      1,
    );
    expect(
      screen.queryByRole("button", { name: /salir del grupo/i }),
    ).not.toBeInTheDocument();
  });

  it("copies the code and shows feedback for 1.5s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /^copiar$/i }));

    expect(await screen.findByText(/copiado/i)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("ABC234");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(
      screen.getByRole("button", { name: /^copiar$/i }),
    ).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows an error when copying fails", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /^copiar$/i }));

    expect(await screen.findByText("denied")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("regenerates the code after confirming", async () => {
    confirmWith(true);
    api.mockResolvedValue({
      id: "g1",
      nombre: "Estudio",
      materia_id: "m1",
      materia_nombre: "Cálculo",
      owner_id: "u1",
      codigo_invitacion: "ZZZ999",
    });
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /regenerar/i }));

    expect(await screen.findByText("ZZZ999")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/api/grupos/g1/codigo", {
      method: "POST",
    });
  });

  it("does nothing when the confirm dialogs are cancelled", () => {
    confirmWith(false);
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /regenerar/i }));
    fireEvent.click(screen.getByRole("button", { name: /expulsar/i }));
    fireEvent.click(screen.getByRole("button", { name: /borrar grupo/i }));

    expect(api).not.toHaveBeenCalled();
  });

  it("expels a member and updates the list and count", async () => {
    confirmWith(true);
    api.mockResolvedValue(undefined);
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /expulsar/i }));

    await waitFor(() =>
      expect(screen.queryByText("beto@x.com")).not.toBeInTheDocument(),
    );
    expect(api).toHaveBeenCalledWith("/api/grupos/g1/miembros/u2", {
      method: "DELETE",
    });
    expect(screen.getByText("1 miembro")).toBeInTheDocument();
  });

  it("shows the rotated code fetched after expelling", async () => {
    confirmWith(true);
    api.mockImplementation(async (_p: string, opts?: { method?: string }) =>
      opts?.method === "DELETE"
        ? undefined
        : { ...GRUPO, codigo_invitacion: "NEW999", miembros_count: 1 },
    );
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /expulsar/i }));

    expect(await screen.findByText("NEW999")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/api/grupos/g1");
  });

  it("treats a 404 when expelling as success", async () => {
    confirmWith(true);
    api.mockImplementation(async (_p: string, opts?: { method?: string }) => {
      if (opts?.method === "DELETE") throw new Error("API request failed: 404");
      return { ...GRUPO, miembros_count: 1 };
    });
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /expulsar/i }));

    await waitFor(() =>
      expect(screen.queryByText("beto@x.com")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/failed: 404/)).not.toBeInTheDocument();
  });

  it("shows the error when a mutation fails and keeps the member", async () => {
    confirmWith(true);
    api.mockRejectedValue(new Error("API request failed: 403"));
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /expulsar/i }));

    expect(await screen.findByText(/failed: 403/)).toBeInTheDocument();
    expect(screen.getByText("beto@x.com")).toBeInTheDocument();
  });

  it("uses a generic message for non-Error failures", async () => {
    confirmWith(true);
    api.mockRejectedValue("boom");
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /borrar grupo/i }));

    expect(await screen.findByText(/algo sali. mal/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("deletes the grupo and navigates to the list", async () => {
    confirmWith(true);
    api.mockResolvedValue(undefined);
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /borrar grupo/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/grupos"));
    expect(api).toHaveBeenCalledWith("/api/grupos/g1", { method: "DELETE" });
  });

  it("renames the grupo from the edit modal", async () => {
    api.mockResolvedValue({
      id: "g1",
      nombre: "Renombrado",
      materia_id: "m1",
      materia_nombre: "Cálculo",
      owner_id: "u1",
      codigo_invitacion: "ABC234",
    });
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /^editar$/i }));
    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Renombrado" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("Renombrado")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/api/grupos/g1", {
      method: "PUT",
      body: { nombre: "Renombrado" },
    });
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });

  it("closes the edit modal when cancelled", () => {
    renderOwner();

    fireEvent.click(screen.getByRole("button", { name: /^editar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });
});

describe("GrupoDetalleClient as member", () => {
  function renderMember() {
    return render(
      <GrupoDetalleClient
        grupo={{ ...GRUPO, rol: "member" }}
        miembros={MIEMBROS}
        userId="u2"
      />,
    );
  }

  it("hides owner actions and only offers leaving on its own row", () => {
    renderMember();

    expect(
      screen.queryByRole("button", { name: /regenerar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /expulsar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /borrar grupo/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^editar$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /salir del grupo/i }),
    ).toHaveLength(1);
  });

  it("leaves the grupo and navigates to the list", async () => {
    confirmWith(true);
    api.mockResolvedValue(undefined);
    renderMember();

    fireEvent.click(screen.getByRole("button", { name: /salir del grupo/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/grupos"));
    expect(api).toHaveBeenCalledWith("/api/grupos/g1/miembros/u2", {
      method: "DELETE",
    });
  });

  it("stays when the leave confirm is cancelled", () => {
    confirmWith(false);
    renderMember();

    fireEvent.click(screen.getByRole("button", { name: /salir del grupo/i }));

    expect(api).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
