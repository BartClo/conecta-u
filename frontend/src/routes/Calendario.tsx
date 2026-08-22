import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useState } from "react";
import EventoFormModal, { type EventoFormData } from "../components/EventoFormModal";
import { apiFetch } from "../lib/api";
import { TIPO_EVENTO_COLOR } from "../lib/tiposEvento";
import type { Curso, Evento, Ocurrencia } from "../lib/types";

export default function Calendario() {
  const [mesActual, setMesActual] = useState(new Date());
  const [ocurrencias, setOcurrencias] = useState<Ocurrencia[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | undefined>(undefined);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | undefined>(undefined);

  const inicioGrilla = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 });
  const finGrilla = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 });
  const dias = eachDayOfInterval({ start: inicioGrilla, end: finGrilla });

  function reloadOcurrencias() {
    const desde = format(inicioGrilla, "yyyy-MM-dd");
    const hasta = format(finGrilla, "yyyy-MM-dd");
    apiFetch<Ocurrencia[]>(`/api/eventos?desde=${desde}&hasta=${hasta}`).then(setOcurrencias);
  }

  useEffect(() => {
    reloadOcurrencias();
    apiFetch<Curso[]>("/api/cursos").then(setCursos);
  }, [mesActual]);

  function ocurrenciasDelDia(dia: Date) {
    return ocurrencias.filter((o) => isSameDay(new Date(o.fecha_inicio), dia));
  }

  function abrirCreacion(dia: Date) {
    setEventoSeleccionado(undefined);
    setDiaSeleccionado(format(dia, "yyyy-MM-dd"));
    setModalAbierto(true);
  }

  function abrirEdicion(ocurrencia: Ocurrencia) {
    apiFetch<Evento>(`/api/eventos/${ocurrencia.id}`).then((evento) => {
      setEventoSeleccionado(evento);
      setDiaSeleccionado(undefined);
      setModalAbierto(true);
    });
  }

  function guardarEvento(data: EventoFormData) {
    const request = eventoSeleccionado
      ? apiFetch<Evento>(`/api/eventos/${eventoSeleccionado.id}`, { method: "PUT", body: data })
      : apiFetch<Evento>("/api/eventos", { method: "POST", body: data });
    request.then(() => {
      setModalAbierto(false);
      reloadOcurrencias();
    });
  }

  function borrarEvento() {
    if (!eventoSeleccionado) return;
    if (!confirm(`¿Borrar el evento "${eventoSeleccionado.titulo}"?`)) return;
    apiFetch(`/api/eventos/${eventoSeleccionado.id}`, { method: "DELETE" }).then(() => {
      setModalAbierto(false);
      reloadOcurrencias();
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            aria-label="mes anterior"
            onClick={() => setMesActual((m) => subMonths(m, 1))}
            className="rounded border px-2 py-1"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold capitalize">{format(mesActual, "MMMM yyyy")}</h1>
          <button
            aria-label="mes siguiente"
            onClick={() => setMesActual((m) => addMonths(m, 1))}
            className="rounded border px-2 py-1"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {dias.map((dia) => (
          <div
            key={dia.toISOString()}
            className="min-h-24 rounded border p-1"
            style={{ opacity: isSameMonth(dia, mesActual) ? 1 : 0.4 }}
          >
            <button
              onClick={() => abrirCreacion(dia)}
              className="text-xs text-gray-500 hover:underline"
            >
              {format(dia, "d")}
            </button>
            <div className="mt-1 space-y-1">
              {ocurrenciasDelDia(dia).map((o) => (
                <button
                  key={`${o.id}-${o.fecha_inicio}`}
                  onClick={() => abrirEdicion(o)}
                  className="block w-full truncate rounded px-1 text-left text-xs text-white"
                  style={{ backgroundColor: TIPO_EVENTO_COLOR[o.tipo] }}
                >
                  {o.titulo}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

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
          <button
            onClick={borrarEvento}
            className="rounded border border-red-600 bg-white px-3 py-1 text-red-600"
          >
            Borrar evento
          </button>
        </div>
      )}
    </div>
  );
}
