import { describe, expect, it } from "vitest";
import { mensajeDeError, statusDeError, TEST_EN_USO } from "../lib/api-error";

describe("mensajeDeError", () => {
  it.each([
    [400, "Los datos enviados no son válidos."],
    [401, "Tu sesión expiró. Vuelve a iniciar sesión."],
    [403, "No tienes permiso para realizar esta acción."],
    [404, "El recurso ya no existe."],
    [422, "Los datos enviados no son válidos."],
    [500, "Error del servidor. Intenta de nuevo."],
  ])("maps status %i", (status, texto) => {
    expect(
      mensajeDeError(new Error(`API request failed: ${status}`), "f"),
    ).toBe(texto);
  });

  it("lets callers override a status message", () => {
    expect(
      mensajeDeError(new Error("API request failed: 409"), "f", TEST_EN_USO),
    ).toBe("Este test ya tiene desafíos y no se puede modificar");
  });

  it("keeps app-originated Error messages and falls back otherwise", () => {
    expect(mensajeDeError(new Error("Mensaje propio"), "f")).toBe(
      "Mensaje propio",
    );
    expect(mensajeDeError("boom", "f")).toBe("f");
  });
});

describe("statusDeError", () => {
  it("extracts the status or returns null", () => {
    expect(statusDeError(new Error("API request failed: 409"))).toBe(409);
    expect(statusDeError(new Error("otra cosa"))).toBeNull();
    expect(statusDeError("boom")).toBeNull();
  });
});
