"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
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
  ranking: RankingDesafioEntry[];
  userId: string;
}

export function DesafioRanking({
  desafio: inicial,
  ranking,
  userId,
}: DesafioRankingProps) {
  const queryClient = useQueryClient();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setCerrando(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Ranking del desafío</h2>

      {cerrado && (
        <motion.div
          variants={winnerHighlight}
          initial={reduced ? false : "initial"}
          animate="animate"
          className="rounded-xl border bg-muted p-4"
        >
          {desafio.ganador_user_id === null ? (
            <p className="font-medium">Desafío cerrado sin ganador</p>
          ) : (
            <>
              <p className="flex items-center gap-2 font-medium">
                <Trophy aria-hidden className="size-4" /> Ganador:{" "}
                {desafio.ganador_nombre}
              </p>
              {desafio.premio_acreditado && (
                <p className="text-sm">
                  +{desafio.premio_creditos} créditos para{" "}
                  {desafio.ganador_nombre}
                </p>
              )}
            </>
          )}
        </motion.div>
      )}

      {ranking.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nadie ha respondido este desafío todavía.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Usuario</th>
              <th className="p-2">Puntaje</th>
              <th className="p-2">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((e) => {
              const ganador = cerrado && e.user_id === desafio.ganador_user_id;
              return (
                <tr
                  key={e.user_id}
                  data-ganador={ganador}
                  className={ganador ? "bg-muted font-semibold" : undefined}
                >
                  <td className="p-2">{e.posicion}</td>
                  <td className="p-2">
                    {ganador && (
                      <Trophy
                        aria-label="Ganador"
                        className="mr-1 inline size-4"
                      />
                    )}
                    {e.nombre}
                    {!e.elegible && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-normal">
                        no elegible
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {e.puntaje} / {e.total}
                  </td>
                  <td className="p-2">{formatoTiempo(e.segundos)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {puedeCerrar(desafio, userId, cliente) && (
        <Button onClick={handleCerrar} disabled={cerrando}>
          {cerrando ? "Cerrando..." : "Cerrar desafío"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
