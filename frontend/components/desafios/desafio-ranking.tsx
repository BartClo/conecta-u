"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lock, Medal, Trophy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { formatoTiempo, puedeCerrar } from "@/lib/desafios";
import { useReducedMotionSafe, winnerHighlight } from "@/lib/motion";
import type {
  DesafioCerrado,
  DesafioDetalle,
  RankingDesafioEntry,
} from "@/lib/types";

interface DesafioRankingProps {
  desafio: DesafioDetalle;
  // null: sin tabla (solo la accion de cerrar, p. ej. mientras aun no se rinde).
  ranking: RankingDesafioEntry[] | null;
  userId: string;
}

export function DesafioRanking({
  desafio: inicial,
  ranking,
  userId,
}: DesafioRankingProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const [desafio, setDesafio] = useState(inicial);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clock-dependent visibility is decided after mount (no hydration mismatch).
  const cliente = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const cerrado = desafio.estado === "cerrado";

  async function handleCerrar() {
    if (
      !window.confirm(
        "¿Cerrar este desafío? Se determinará el ganador y no se podrá revertir.",
      )
    )
      return;
    setCerrando(true);
    setError(null);
    try {
      const r = await apiFetchClient<DesafioCerrado>(
        `/api/desafios/${desafio.id}/cerrar`,
        { method: "POST" },
      );
      setDesafio((prev) => ({ ...prev, ...r }));
      await queryClient.invalidateQueries({ queryKey: ["creditos"] });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setCerrando(false);
    }
  }

  const cerrable = puedeCerrar(desafio, userId, cliente);
  // Nothing to show yet (not played, still open, cannot close): no empty card.
  if (!ranking && !cerrado && !cerrable && !error) return null;

  return (
    <section className="space-y-4 rounded-2xl border bg-card/70 p-4">
      {ranking && (
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          <Medal className="size-4 text-gold" aria-hidden />
          Ranking del desafío
        </h2>
      )}

      {cerrado && (
        <motion.div
          variants={winnerHighlight}
          initial={reduced ? false : "initial"}
          animate="animate"
          className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/20 via-gold/5 to-transparent p-5"
        >
          {desafio.ganador_user_id === null ? (
            <p className="flex items-center gap-2 font-medium">
              <Lock
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              Desafío cerrado sin ganador (se necesitan al menos 2 participantes
              elegibles)
            </p>
          ) : (
            <>
              <p className="flex items-center gap-3 font-heading text-xl font-bold">
                <span className="grid size-11 place-items-center rounded-xl bg-gold text-background shadow-[0_0_30px_-6px_var(--gold)]">
                  <Trophy aria-hidden className="size-6" />
                </span>
                Ganador: {desafio.ganador_nombre}
              </p>
              {desafio.premio_acreditado && (
                <p className="mt-2 text-sm font-semibold text-xp">
                  +{desafio.premio_creditos} créditos para{" "}
                  {desafio.ganador_nombre}
                </p>
              )}
            </>
          )}
        </motion.div>
      )}

      {ranking === null ? null : ranking.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nadie ha respondido este desafío todavía.
        </p>
      ) : (
        <table className="w-full border-separate border-spacing-y-1.5 text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-1 font-medium">#</th>
              <th className="px-3 py-1 font-medium">Usuario</th>
              <th className="px-3 py-1 font-medium">Puntaje</th>
              <th className="px-3 py-1 font-medium">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((e) => {
              const ganador = cerrado && e.user_id === desafio.ganador_user_id;
              const celda = ganador
                ? "bg-gold/15 font-semibold"
                : e.user_id === userId
                  ? "bg-primary/15"
                  : "bg-background/40";
              return (
                <tr key={e.user_id} data-ganador={ganador}>
                  <td
                    className={`rounded-l-xl px-3 py-2 font-heading font-bold tabular ${e.posicion <= 3 ? "text-gold" : "text-muted-foreground"} ${celda}`}
                  >
                    {e.posicion}
                  </td>
                  <td className={`px-3 py-2 ${celda}`}>
                    {ganador && (
                      <Trophy
                        aria-label="Ganador"
                        className="mr-1 inline size-4 text-gold"
                      />
                    )}
                    {e.nombre}
                    {!e.elegible && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-normal">
                        no elegible
                      </span>
                    )}
                  </td>
                  <td className={`px-3 py-2 tabular ${celda}`}>
                    {e.puntaje} / {e.total}
                  </td>
                  <td className={`rounded-r-xl px-3 py-2 font-mono ${celda}`}>
                    {formatoTiempo(e.segundos)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {cerrable && (
        <Button size="lg" onClick={handleCerrar} disabled={cerrando}>
          <Lock aria-hidden />
          {cerrando ? "Cerrando..." : "Cerrar desafío"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
