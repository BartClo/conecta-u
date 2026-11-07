"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import {
  podiumEntry,
  staggerContainer,
  useReducedMotionSafe,
} from "@/lib/motion";
import type { LeaderboardEntry } from "@/lib/types";

function iniciales(nombre: string): string {
  return nombre.slice(0, 2).toUpperCase();
}

// Visual order: 2nd, 1st, 3rd. The entries arrive already ranked by the backend.
const ORDEN_PODIO = [1, 0, 2];
const ALTURA = ["h-36", "h-28", "h-24"];

export function Leaderboard({
  entries,
  vacio,
}: {
  entries: LeaderboardEntry[];
  vacio: string;
}) {
  const reduced = useReducedMotionSafe();
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{vacio}</p>;
  }
  const top = entries.slice(0, 3);
  const resto = entries.slice(3);

  return (
    <div className="space-y-4">
      <motion.ol
        aria-label="Podio"
        variants={staggerContainer}
        initial={reduced ? false : "initial"}
        animate="animate"
        className="flex items-end justify-center gap-3"
      >
        {ORDEN_PODIO.filter((i) => i < top.length).map((i) => (
          <motion.li
            key={top[i].user_id}
            variants={podiumEntry}
            data-podio={i + 1}
            className={`flex w-28 flex-col items-center justify-end gap-1 rounded-xl border bg-card p-2 text-center ${ALTURA[i]}`}
          >
            {i === 0 && <Trophy aria-hidden className="size-5" />}
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold"
            >
              {iniciales(top[i].nombre)}
            </span>
            <span className="w-full truncate text-sm font-medium">
              {top[i].nombre}
            </span>
            <span className="text-xs text-muted-foreground">
              {top[i].posicion}º · {top[i].desafios_ganados} ganados ·{" "}
              {top[i].suma_puntajes} pts
            </span>
          </motion.li>
        ))}
      </motion.ol>

      {resto.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Ganados</th>
              <th className="p-2">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {resto.map((e) => (
              <tr key={e.user_id}>
                <td className="p-2">{e.posicion}</td>
                <td className="p-2">{e.nombre}</td>
                <td className="p-2">{e.desafios_ganados}</td>
                <td className="p-2">{e.suma_puntajes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
