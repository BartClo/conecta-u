"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { motion } from "framer-motion";
import { pageTransition } from "@/lib/motion";
import { TIPO_EVENTO_COLOR } from "@/lib/tiposEvento";
import type { Ocurrencia } from "@/lib/types";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface MonthGridProps {
  monthDate: Date;
  ocurrencias: Ocurrencia[];
  onDayClick: (day: Date) => void;
  onOcurrenciaClick: (o: Ocurrencia) => void;
}

export function MonthGrid({
  monthDate,
  ocurrencias,
  onDayClick,
  onOcurrenciaClick,
}: MonthGridProps) {
  const inicioGrilla = startOfWeek(startOfMonth(monthDate), {
    weekStartsOn: 1,
  });
  const finGrilla = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const dias = eachDayOfInterval({ start: inicioGrilla, end: finGrilla });

  function ocurrenciasDelDia(dia: Date) {
    return ocurrencias.filter((o) => isSameDay(new Date(o.fecha_inicio), dia));
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card/60 p-2">
      <div className="grid min-w-[640px] grid-cols-7 gap-1.5">
        {DIAS.map((d) => (
          <div
            key={d}
            aria-hidden
            className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="grid min-w-[640px] grid-cols-7 gap-1.5"
      >
        {dias.map((dia) => {
          const delMes = isSameMonth(dia, monthDate);
          const hoy = isToday(dia);
          return (
            <div
              key={dia.toISOString()}
              className={`group min-h-28 rounded-xl border p-1.5 transition-colors ${
                hoy
                  ? "border-primary/60 bg-primary/10"
                  : delMes
                    ? "bg-background/40 hover:border-foreground/20"
                    : "border-transparent bg-transparent"
              }`}
              style={{ opacity: delMes ? 1 : 0.4 }}
            >
              <button
                onClick={() => onDayClick(dia)}
                title="Crear evento"
                className={`grid size-7 cursor-pointer place-items-center rounded-lg text-xs font-semibold transition-colors ${
                  hoy
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {format(dia, "d")}
              </button>
              <div className="mt-1 space-y-1">
                {ocurrenciasDelDia(dia).map((o) => {
                  const c = TIPO_EVENTO_COLOR[o.tipo];
                  return (
                    <button
                      key={`${o.id}-${o.fecha_inicio}`}
                      onClick={() => onOcurrenciaClick(o)}
                      className="block w-full cursor-pointer truncate rounded-md border-l-2 px-1.5 py-0.5 text-left text-xs font-medium text-foreground transition-transform hover:translate-x-0.5"
                      style={{ borderColor: c, backgroundColor: `${c}2e` }}
                    >
                      {o.titulo}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
