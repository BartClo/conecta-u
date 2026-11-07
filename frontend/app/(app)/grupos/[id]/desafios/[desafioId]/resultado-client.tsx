"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatoTiempo } from "@/lib/desafios";
import { modalVariants, staggerContainer, staggerItem } from "@/lib/motion";
import type { IntentoOut, ResultadoDesafioOut } from "@/lib/types";

interface ResultadoClientProps {
  grupoId: string;
  miIntento: IntentoOut;
  // Table shown right after submitting; the desafio page passes `children` instead.
  resultados?: ResultadoDesafioOut[];
  children?: ReactNode;
  // Only true right after submitting in this session.
  recienRendido?: boolean;
}

export function ResultadoClient({
  grupoId,
  miIntento,
  resultados,
  children,
  recienRendido = false,
}: ResultadoClientProps) {
  const perfecto = miIntento.puntaje === miIntento.total;

  return (
    <div className="space-y-6">
      <motion.div
        variants={recienRendido ? modalVariants : undefined}
        initial="initial"
        animate="animate"
        className="space-y-1"
      >
        <h1 className="text-3xl font-semibold">
          Tu puntaje: {miIntento.puntaje} / {miIntento.total}
        </h1>
        <p className="text-muted-foreground">
          en {formatoTiempo(miIntento.segundos)}
        </p>
        {recienRendido && perfecto && (
          <p className="flex items-center gap-2 font-medium">
            <Trophy aria-hidden /> ¡Perfecto!
          </p>
        )}
      </motion.div>

      {resultados && (
        <div className="space-y-2">
          <h2 className="font-semibold">Resultados del desafío</h2>
          <motion.table
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="w-full text-left text-sm"
          >
            <thead>
              <tr>
                <th className="p-2">Usuario</th>
                <th className="p-2">Puntaje</th>
                <th className="p-2">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => {
                const mia = r.user_id === miIntento.user_id;
                return (
                  <motion.tr
                    key={r.user_id}
                    variants={staggerItem}
                    data-mia={mia}
                    className={mia ? "bg-muted font-semibold" : undefined}
                  >
                    <td className="p-2">{r.user_nombre}</td>
                    <td className="p-2">
                      {r.puntaje} / {r.total}
                    </td>
                    <td className="p-2">{formatoTiempo(r.segundos)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </motion.table>
        </div>
      )}

      {children}

      <Link
        href={`/grupos/${grupoId}/desafios`}
        className={buttonVariants({ variant: "outline" })}
      >
        Volver a desafíos
      </Link>
    </div>
  );
}
