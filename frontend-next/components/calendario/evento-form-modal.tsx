"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { modalVariants } from "@/lib/motion";
import {
  DIAS_SEMANA_LABEL,
  TIPO_EVENTO_LABEL,
  TIPOS_EVENTO,
} from "@/lib/tiposEvento";
import type { Curso, Evento, TipoEvento } from "@/lib/types";

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

export function EventoFormModal({
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
  const [diaSemana, setDiaSemana] = useState(
    evento?.recurrencia_dia_semana ?? 0,
  );
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
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center bg-black/40">
        <motion.form
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onSubmit={handleSubmit}
          className="w-96 space-y-3 rounded-xl bg-card p-6 shadow-xl"
        >
          <h2 className="text-lg font-semibold">
            {evento ? "Editar evento" : "Nuevo evento"}
          </h2>

          <div className="space-y-1">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEvento)}
              className="w-full rounded border bg-background px-2 py-1"
            >
              {TIPOS_EVENTO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_EVENTO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="curso">Curso</Label>
            <select
              id="curso"
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              className="w-full rounded border bg-background px-2 py-1"
            >
              <option value="">Sin curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fecha_inicio">Fecha y hora de inicio</Label>
            <Input
              id="fecha_inicio"
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="fecha_fin">Fecha y hora de fin</Label>
            <Input
              id="fecha_fin"
              type="datetime-local"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="repite"
              type="checkbox"
              checked={repite}
              onChange={(e) => setRepite(e.target.checked)}
            />
            <Label htmlFor="repite">Repetir semanalmente</Label>
          </div>

          {repite && (
            <>
              <div className="space-y-1">
                <Label htmlFor="dia_semana">Día de la semana</Label>
                <select
                  id="dia_semana"
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(Number(e.target.value))}
                  className="w-full rounded border bg-background px-2 py-1"
                >
                  {DIAS_SEMANA_LABEL.map((nombre, idx) => (
                    <option key={idx} value={idx}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="hasta">Repetir hasta</Label>
                <Input
                  id="hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
