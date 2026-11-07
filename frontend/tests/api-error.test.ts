import { describe, expect, it } from "vitest";
import { mensajeDeError } from "../lib/api-error";

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

  it("keeps app-originated Error messages and falls back otherwise", () => {
    expect(mensajeDeError(new Error("Mensaje propio"), "f")).toBe(
      "Mensaje propio",
    );
    expect(mensajeDeError("boom", "f")).toBe("f");
  });
});
