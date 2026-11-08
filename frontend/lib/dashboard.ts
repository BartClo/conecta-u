import { puedeRendirse } from "./desafios";
import type { DesafioOut, Grupo, LeaderboardEntry } from "./types";

export interface DesafioPendiente extends DesafioOut {
  grupo_nombre: string;
}

/** Open desafios the user can still take, soonest deadline first (no deadline last). */
export function desafiosPendientes(
  grupos: Grupo[],
  desafiosPorGrupo: Record<string, DesafioOut[]>,
  ahora = Date.now(),
): DesafioPendiente[] {
  const fin = (d: DesafioOut) =>
    d.fecha_fin ? new Date(d.fecha_fin).getTime() : Infinity;
  return grupos
    .flatMap((g) =>
      (desafiosPorGrupo[g.id] ?? [])
        .filter((d) => !d.ya_rindio && puedeRendirse(d, ahora))
        .map((d) => ({ ...d, grupo_nombre: g.nombre })),
    )
    .sort((a, b) => fin(a) - fin(b));
}

export interface PosicionGrupo {
  grupo: Grupo;
  posicion: number;
  participantes: number;
  ganados: number;
  puntos: number;
}

/** The user's standing in each group leaderboard they appear in, best first. */
export function mejoresPosiciones(
  grupos: Grupo[],
  leaderboards: Record<string, LeaderboardEntry[]>,
  userId: string,
): PosicionGrupo[] {
  return grupos
    .flatMap((grupo) => {
      const tabla = leaderboards[grupo.id] ?? [];
      const yo = tabla.find((e) => e.user_id === userId);
      return yo
        ? [
            {
              grupo,
              posicion: yo.posicion,
              participantes: tabla.length,
              ganados: yo.desafios_ganados,
              puntos: yo.suma_puntajes,
            },
          ]
        : [];
    })
    .sort((a, b) => a.posicion - b.posicion || b.ganados - a.ganados);
}

/** "en 3 h", "en 2 d", "hoy" — compact time left until a deadline. */
export function tiempoRestante(
  fecha: string | null,
  ahora = Date.now(),
): string {
  if (!fecha) return "sin límite";
  const ms = new Date(fecha).getTime() - ahora;
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "menos de 1 h";
  if (h < 48) return `quedan ${h} h`;
  return `quedan ${Math.floor(h / 24)} días`;
}
