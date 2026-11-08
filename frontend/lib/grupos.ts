import type { DesafioOut, Grupo, LeaderboardEntry, Miembro } from "./types";

export interface GrupoStats {
  miembros: string[];
  abiertos: number;
  posicion: number | null;
  participantes: number;
}

/** Per-group summary for the /grupos cards: members, open desafios, my rank. */
export function statsDeGrupos(
  grupos: Grupo[],
  miembros: Record<string, Miembro[]>,
  desafios: Record<string, DesafioOut[]>,
  tablas: Record<string, LeaderboardEntry[]>,
  userId: string,
): Record<string, GrupoStats> {
  return Object.fromEntries(
    grupos.map((g) => {
      const tabla = tablas[g.id] ?? [];
      return [
        g.id,
        {
          miembros: (miembros[g.id] ?? []).map((m) => m.nombre ?? m.email),
          abiertos: (desafios[g.id] ?? []).filter((d) => d.estado === "abierto")
            .length,
          posicion: tabla.find((e) => e.user_id === userId)?.posicion ?? null,
          participantes: tabla.length,
        },
      ];
    }),
  );
}
