"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Sparkles, Target, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatoTiempo } from "@/lib/desafios";
import {
  modalVariants,
  staggerContainer,
  staggerItem,
  useReducedMotionSafe,
} from "@/lib/motion";
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

const CONFETI = ["bg-primary", "bg-xp", "bg-gold", "bg-cyan"];

function Confeti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 28 }, (_, i) => {
        const ang = (i / 28) * Math.PI * 2;
        const dist = 140 + (i % 4) * 45;
        return (
          <motion.span
            key={i}
            className={`absolute left-1/2 top-1/3 size-2 rounded-sm ${CONFETI[i % 4]}`}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(ang) * dist,
              y: Math.sin(ang) * dist + 80,
              opacity: 0,
              rotate: 360,
            }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
          />
        );
      })}
    </div>
  );
}

export function ResultadoClient({
  grupoId,
  miIntento,
  resultados,
  children,
  recienRendido = false,
}: ResultadoClientProps) {
  const reduced = useReducedMotionSafe();
  const perfecto = miIntento.puntaje === miIntento.total;
  const pct = miIntento.total
    ? Math.round((miIntento.puntaje / miIntento.total) * 100)
    : 0;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-6">
      <Link
        href={`/grupos/${grupoId}/desafios`}
        className={buttonVariants({ variant: "ghost" })}
      >
        <ArrowLeft aria-hidden />
        Volver a desafíos
      </Link>

      <motion.section
        variants={recienRendido ? modalVariants : undefined}
        initial="initial"
        animate="animate"
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/25 via-card/80 to-xp/10 p-6 sm:p-8"
      >
        <span className="bg-grid absolute inset-0 opacity-40" aria-hidden />
        {recienRendido && !reduced && <Confeti />}
        <div className="relative flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative grid size-36 shrink-0 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={R}
                className="fill-none stroke-muted"
                strokeWidth="10"
              />
              <motion.circle
                cx="60"
                cy="60"
                r={R}
                className={`fill-none ${perfecto ? "stroke-gold" : "stroke-primary"}`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{
                  strokeDashoffset: reduced ? C * (1 - pct / 100) : C,
                }}
                animate={{ strokeDashoffset: C * (1 - pct / 100) }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            <span className="font-heading text-4xl font-black tabular">
              {pct}%
            </span>
          </div>
          <div className="space-y-2 text-center sm:text-left">
            {recienRendido && perfecto && (
              <p className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 font-semibold text-gold">
                <Trophy aria-hidden className="size-4" /> ¡Perfecto!
              </p>
            )}
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Tu puntaje: {miIntento.puntaje} / {miIntento.total}
            </h1>
            <div className="flex flex-wrap justify-center gap-2 text-sm sm:justify-start">
              <span className="flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-muted-foreground">
                <Clock className="size-4 text-cyan" aria-hidden />
                <span>en {formatoTiempo(miIntento.segundos)}</span>
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-muted-foreground">
                <Target className="size-4 text-xp" aria-hidden />
                {miIntento.puntaje}{" "}
                {miIntento.puntaje === 1 ? "acierto" : "aciertos"}
              </span>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <Sparkles className="size-4 text-xp" aria-hidden />
              {pct === 100
                ? "Impecable: no se te escapó ninguna."
                : pct >= 60
                  ? "¡Bien jugado! Estás en la pelea por el primer lugar."
                  : "Sigue practicando: cada desafío suma."}
            </p>
          </div>
        </div>
      </motion.section>

      {resultados && (
        <section className="space-y-3 rounded-2xl border bg-card/70 p-4">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <Trophy className="size-4 text-gold" aria-hidden />
            Resultados del desafío
          </h2>
          <motion.table
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="w-full border-separate border-spacing-y-1.5 text-left text-sm"
          >
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-1 font-medium">Usuario</th>
                <th className="px-3 py-1 font-medium">Puntaje</th>
                <th className="px-3 py-1 font-medium">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => {
                const mia = r.user_id === miIntento.user_id;
                const celda = mia
                  ? "bg-primary/15 font-semibold"
                  : "bg-background/40";
                return (
                  <motion.tr
                    key={r.user_id}
                    variants={staggerItem}
                    data-mia={mia}
                  >
                    <td className={`rounded-l-xl px-3 py-2 ${celda}`}>
                      {r.user_nombre}
                    </td>
                    <td className={`px-3 py-2 tabular ${celda}`}>
                      {r.puntaje} / {r.total}
                    </td>
                    <td className={`rounded-r-xl px-3 py-2 font-mono ${celda}`}>
                      {formatoTiempo(r.segundos)}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </motion.table>
        </section>
      )}

      {children}
    </div>
  );
}
