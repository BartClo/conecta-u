import { useState } from "react";
import { DIAS_SEMANA_LABEL, TIPO_EVENTO_LABEL, TIPOS_EVENTO } from "../lib/tiposEvento";
import type { Curso, Evento, TipoEvento } from "../lib/types";

export interface EventoFormData {
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fecha_inicio: string;
  fecha_fin: string | null;
  curso_id: string | null;
  recurrencia_dia_semana: number | null;
  recurrencia_hasta: string | null;
}

interface EventoFormModalProps {
  evento?: Evento;
  cursos: Curso[];
  fechaInicial?: string;
  onSubmit: (data: EventoFormData) => void;
  onClose: () => void;
}

export default function EventoFormModal({
  evento,
  cursos,
  fechaInicial,
  onSubmit,
  onClose,
}: EventoFormModalProps) {
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? "");
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? "personal");
  const [fechaInicio, setFechaInicio] = useState(
    evento?.fecha_inicio ?? (fechaInicial ? `${fechaInicial}T09:00` : ""),
  );
  const [fechaFin, setFechaFin] = useState(evento?.fecha_fin ?? "");
  const [cursoId, setCursoId] = useState(evento?.curso_id ?? "");
  const [repite, setRepite] = useState(evento?.recurrencia_dia_semana != null);
  const [diaSemana, setDiaSemana] = useState(evento?.recurrencia_dia_semana ?? 0);
  const [hasta, setHasta] = useState(evento?.recurrencia_hasta ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      titulo,
      descripcion: descripcion || null,
      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin || null,
      curso_id: cursoId || null,
      recurrencia_dia_semana: repite ? diaSemana : null,
      recurrencia_hasta: repite ? hasta || null : null,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-3 rounded bg-white p-6">
        <h2 className="text-lg font-semibold">{evento ? "Editar evento" : "Nuevo evento"}</h2>

        <label className="block text-sm">
          Título
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Descripción
          <textarea
            className="mt-1 w-full rounded border px-2 py-1"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Tipo
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEvento)}
          >
            {TIPOS_EVENTO.map((t) => (
              <option key={t} value={t}>
                {TIPO_EVENTO_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Curso
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={cursoId}
            onChange={(e) => setCursoId(e.target.value)}
          >
            <option value="">Sin curso</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Fecha y hora de inicio
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border px-2 py-1"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Fecha y hora de fin
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border px-2 py-1"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={repite} onChange={(e) => setRepite(e.target.checked)} />
          Repetir semanalmente
        </label>

        {repite && (
          <>
            <label className="block text-sm">
              Día de la semana
              <select
                className="mt-1 w-full rounded border px-2 py-1"
                value={diaSemana}
                onChange={(e) => setDiaSemana(Number(e.target.value))}
              >
                {DIAS_SEMANA_LABEL.map((nombre, idx) => (
                  <option key={idx} value={idx}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Repetir hasta
              <input
                type="date"
                className="mt-1 w-full rounded border px-2 py-1"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                required
              />
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1">
            Cancelar
          </button>
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
