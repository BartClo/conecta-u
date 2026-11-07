import { mensajeDeError, statusDeError } from "./api-error";

export function mensajeGeneracion(err: unknown, que: "test" | "resumen") {
  const status = statusDeError(err);
  if (status === 402) {
    return `No tienes créditos suficientes para generar este ${que}.`;
  }
  if (status === 502) {
    return `No se pudo generar el ${que} en este momento. No se te cobraron créditos — intenta de nuevo.`;
  }
  return mensajeDeError(err, `No se pudo generar el ${que}.`);
}
