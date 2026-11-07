import type { DesafioOut } from "./types";

/** mm:ss for a duration in whole seconds. */
export function formatoTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** True when the desafio is open and `ahora` falls inside its window. */
export function puedeRendirse(d: DesafioOut, ahora = Date.now()): boolean {
  return (
    d.estado === "abierto" &&
    ahora >= new Date(d.fecha_inicio).getTime() &&
    (d.fecha_fin === null || ahora <= new Date(d.fecha_fin).getTime())
  );
}
