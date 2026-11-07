"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { TIPO_EVENTO_COLOR } from "@/lib/tiposEvento";
import type { Ocurrencia } from "@/lib/types";

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
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-7 gap-1"
    >
      {dias.map((dia) => (
        <motion.div
          key={dia.toISOString()}
          variants={staggerItem}
          className="min-h-24 rounded border p-1"
          style={{ opacity: isSameMonth(dia, monthDate) ? 1 : 0.4 }}
        >
          <button
            onClick={() => onDayClick(dia)}
            className="text-xs text-muted-foreground hover:underline"
          >
            {format(dia, "d")}
          </button>
          <div className="mt-1 space-y-1">
            {ocurrenciasDelDia(dia).map((o) => (
              <button
                key={`${o.id}-${o.fecha_inicio}`}
                onClick={() => onOcurrenciaClick(o)}
                className="block w-full truncate rounded px-1 text-left text-xs text-white"
                style={{ backgroundColor: TIPO_EVENTO_COLOR[o.tipo] }}
              >
                {o.titulo}
              </button>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
