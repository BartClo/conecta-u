import { useState } from "react";
import type { Semestre } from "../lib/types";

interface SemestreFormModalProps {
  semestre?: Semestre;
  onSubmit: (data: { nombre: string; fecha_inicio: string; fecha_fin: string }) => void;
  onClose: () => void;
}

export default function SemestreFormModal({ semestre, onSubmit, onClose }: SemestreFormModalProps) {
  const [nombre, setNombre] = useState(semestre?.nombre ?? "");
  const [fechaInicio, setFechaInicio] = useState(semestre?.fecha_inicio ?? "");
  const [fechaFin, setFechaFin] = useState(semestre?.fecha_fin ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ nombre, fecha_inicio: fechaInicio, fecha_fin: fechaFin });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-80 space-y-3 rounded bg-white p-6">
        <h2 className="text-lg font-semibold">{semestre ? "Editar semestre" : "Nuevo semestre"}</h2>

        <label className="block text-sm">
          Nombre
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Fecha de inicio
          <input
            type="date"
            className="mt-1 w-full rounded border px-2 py-1"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Fecha de fin
          <input
            type="date"
            className="mt-1 w-full rounded border px-2 py-1"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            required
          />
        </label>

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
