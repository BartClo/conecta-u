import type { DesafioDetalle, DesafioOut } from "./types";

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

/**
 * Who sees "Cerrar desafio": creator or group owner any time; any member once
 * `fecha_fin` has passed. `conReloj` is false before mount (clock-dependent,
 * so the server render and first client render agree).
 */
export function puedeCerrar(
  d: Pick<DesafioDetalle, "estado" | "creado_por" | "owner_id" | "fecha_fin">,
  userId: string,
  conReloj: boolean,
  ahora = Date.now(),
): boolean {
  if (d.estado !== "abierto") return false;
  if (userId === d.creado_por || userId === d.owner_id) return true;
  return (
    conReloj && d.fecha_fin !== null && ahora > new Date(d.fecha_fin).getTime()
  );
}
