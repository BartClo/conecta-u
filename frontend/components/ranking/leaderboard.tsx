"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/shared/avatar";
import {
  podiumEntry,
  staggerContainer,
  useReducedMotionSafe,
} from "@/lib/motion";
import type { LeaderboardEntry } from "@/lib/types";

// Visual order: 2nd, 1st, 3rd. The entries arrive already ranked by the backend.
const ORDEN_PODIO = [1, 0, 2];
const PEDESTAL = [
  "h-32 from-gold/45 via-gold/15 border-gold/40 text-gold",
  "h-24 from-slate-300/35 via-slate-300/10 border-slate-300/30 text-slate-200",
  "h-16 from-orange-400/35 via-orange-400/10 border-orange-400/30 text-orange-300",
];
const ANILLO = ["ring-gold", "ring-slate-300", "ring-orange-400"];

export function Leaderboard({
  entries,
  vacio,
  userId,
}: {
  entries: LeaderboardEntry[];
  vacio: string;
  // Highlights the viewer's own row when given.
  userId?: string;
}) {
  const reduced = useReducedMotionSafe();
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-card/30 p-8 text-center">
        <Trophy className="size-8 text-gold/70" aria-hidden />
        <p className="text-sm text-muted-foreground">{vacio}</p>
      </div>
    );
  }
  const top = entries.slice(0, 3);
  const resto = entries.slice(3);

  return (
    <div className="space-y-5">
      <motion.ol
        aria-label="Podio"
        variants={staggerContainer}
        initial={reduced ? false : "initial"}
        animate="animate"
        className="mx-auto flex max-w-2xl items-end justify-center gap-2 sm:gap-4"
      >
        {ORDEN_PODIO.filter((i) => i < top.length).map((i) => {
          const e = top[i];
          return (
            <motion.li
              key={e.user_id}
              variants={podiumEntry}
              data-podio={i + 1}
              className="flex w-1/3 max-w-44 flex-col items-center text-center"
            >
              {i === 0 && e.desafios_ganados > 0 && (
                <Trophy
                  aria-hidden
                  className="mb-1 size-7 text-gold drop-shadow-[0_0_12px_var(--gold)]"
                />
              )}
              <Avatar
                nombre={e.nombre}
                className={`ring-4 ${ANILLO[i]} ${i === 0 ? "size-16 text-lg" : "size-12 text-sm"}`}
              />
              <span className="mt-2 w-full truncate font-heading text-sm font-semibold">
                {e.nombre}
                {e.user_id === userId && (
                  <span className="ml-1 text-primary">(tú)</span>
                )}
              </span>
              <span className="mb-2 text-xs text-muted-foreground tabular">
                {e.desafios_ganados} ganados · {e.suma_puntajes} pts
              </span>
              <span
                className={`relative grid w-full place-items-center rounded-t-xl border border-b-0 bg-gradient-to-b to-transparent ${PEDESTAL[i]}`}
              >
                <span className="font-heading text-3xl font-black tabular">
                  {e.posicion}º
                </span>
              </span>
            </motion.li>
          );
        })}
      </motion.ol>

      {resto.length > 0 && (
        <table className="w-full border-separate border-spacing-y-1.5 text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-1 font-medium">#</th>
              <th className="px-3 py-1 font-medium">Nombre</th>
              <th className="px-3 py-1 text-right font-medium">Ganados</th>
              <th className="px-3 py-1 text-right font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {resto.map((e) => {
              const yo = e.user_id === userId;
              const celda = yo ? "bg-primary/15" : "bg-card/70";
              return (
                <tr key={e.user_id} data-yo={yo}>
                  <td
                    className={`rounded-l-xl px-3 py-2 font-heading font-bold text-muted-foreground tabular ${celda}`}
                  >
                    {e.posicion}
                  </td>
                  <td className={`px-3 py-2 font-medium ${celda}`}>
                    {e.nombre}
                  </td>
                  <td className={`px-3 py-2 text-right tabular ${celda}`}>
                    {e.desafios_ganados}
                  </td>
                  <td
                    className={`rounded-r-xl px-3 py-2 text-right font-semibold text-primary tabular ${celda}`}
                  >
                    {e.suma_puntajes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
