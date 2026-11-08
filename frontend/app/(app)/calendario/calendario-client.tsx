"use client";

import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  EventoFormModal,
  type EventoFormData,
} from "@/components/calendario/evento-form-modal";
import { MonthGrid } from "@/components/calendario/month-grid";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { pageTransition } from "@/lib/motion";
import {
  TIPO_EVENTO_COLOR,
  TIPO_EVENTO_LABEL,
  TIPOS_EVENTO,
} from "@/lib/tiposEvento";
import type { Curso, Evento, Ocurrencia } from "@/lib/types";

interface CalendarioClientProps {
  initialOcurrencias: Ocurrencia[];
  initialMonth: string;
  cursos: Curso[];
}

export function CalendarioClient({
  initialOcurrencias,
  initialMonth,
  cursos,
}: CalendarioClientProps) {
  const [mesActual, setMesActual] = useState(new Date(initialMonth));
  const [ocurrencias, setOcurrencias] = useState(initialOcurrencias);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<
    Evento | undefined
  >(undefined);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | undefined>(
    undefined,
  );

  async function reload(mes: Date) {
    const inicioGrilla = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const finGrilla = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    const data = await apiFetchClient<Ocurrencia[]>(
      `/api/eventos?desde=${format(inicioGrilla, "yyyy-MM-dd")}&hasta=${format(finGrilla, "yyyy-MM-dd")}`,
    );
    setOcurrencias(data);
  }

  async function cambiarMes(nuevo: Date) {
    setMesActual(nuevo);
    await reload(nuevo);
  }

  function abrirCreacion(dia: Date) {
    setEventoSeleccionado(undefined);
    setDiaSeleccionado(format(dia, "yyyy-MM-dd"));
    setModalAbierto(true);
  }

  async function abrirEdicion(ocurrencia: Ocurrencia) {
    const evento = await apiFetchClient<Evento>(
      `/api/eventos/${ocurrencia.id}`,
    );
    setEventoSeleccionado(evento);
    setDiaSeleccionado(undefined);
    setModalAbierto(true);
  }

  async function guardarEvento(data: EventoFormData) {
    if (eventoSeleccionado) {
      await apiFetchClient(`/api/eventos/${eventoSeleccionado.id}`, {
        method: "PUT",
        body: data,
      });
    } else {
      await apiFetchClient("/api/eventos", { method: "POST", body: data });
    }
    setModalAbierto(false);
    await reload(mesActual);
  }

  async function borrarEvento() {
    if (!eventoSeleccionado) return;
    if (!confirm(`¿Borrar el evento "${eventoSeleccionado.titulo}"?`)) return;
    await apiFetchClient(`/api/eventos/${eventoSeleccionado.id}`, {
      method: "DELETE",
    });
    setModalAbierto(false);
    await reload(mesActual);
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border bg-card/70 text-cyan">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
              Calendario
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="mes anterior"
                onClick={() => cambiarMes(subMonths(mesActual, 1))}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <h1 className="min-w-48 text-center font-heading text-3xl font-bold tracking-tight capitalize">
                {format(mesActual, "MMMM yyyy", { locale: es })}
              </h1>
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="mes siguiente"
                onClick={() => cambiarMes(addMonths(mesActual, 1))}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        </div>
        <ul aria-label="Tipos de evento" className="flex flex-wrap gap-2">
          {TIPOS_EVENTO.map((t) => (
            <li
              key={t}
              className="flex items-center gap-1.5 rounded-full border bg-card/70 px-2.5 py-1 text-xs"
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: TIPO_EVENTO_COLOR[t] }}
              />
              {TIPO_EVENTO_LABEL[t]}
            </li>
          ))}
        </ul>
      </header>
      <p className="text-sm text-muted-foreground">
        Haz click en un día para crear un evento, o en un evento para editarlo.
      </p>

      <MonthGrid
        monthDate={mesActual}
        ocurrencias={ocurrencias}
        onDayClick={abrirCreacion}
        onOcurrenciaClick={abrirEdicion}
      />

      {modalAbierto && (
        <EventoFormModal
          evento={eventoSeleccionado}
          cursos={cursos}
          fechaInicial={diaSeleccionado}
          onSubmit={guardarEvento}
          onClose={() => setModalAbierto(false)}
        />
      )}
      {modalAbierto && eventoSeleccionado && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center">
          <Button variant="destructive" onClick={borrarEvento}>
            Borrar evento
          </Button>
        </div>
      )}
    </motion.div>
  );
}
