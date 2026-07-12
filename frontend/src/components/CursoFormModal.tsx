import { useState } from "react";
import { COLOR_SWATCH, COLORES_CURSO } from "../lib/colors";
import type { Curso } from "../lib/types";

interface CursoFormModalProps {
  curso?: Curso;
  onSubmit: (data: {
    nombre: string;
    codigo: string;
    profesor: string | null;
    color: string;
  }) => void;
  onClose: () => void;
}

export default function CursoFormModal({ curso, onSubmit, onClose }: CursoFormModalProps) {
  const [nombre, setNombre] = useState(curso?.nombre ?? "");
  const [codigo, setCodigo] = useState(curso?.codigo ?? "");
  const [profesor, setProfesor] = useState(curso?.profesor ?? "");
  const [color, setColor] = useState(curso?.color ?? COLORES_CURSO[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ nombre, codigo, profesor: profesor || null, color });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-80 space-y-3 rounded bg-white p-6">
        <h2 className="text-lg font-semibold">{curso ? "Editar curso" : "Nuevo curso"}</h2>

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
          Código
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Profesor
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
          />
        </label>

        <div className="text-sm">
          Color
          <div className="mt-1 flex flex-wrap gap-2">
            {COLORES_CURSO.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-black" : ""}`}
                style={{ backgroundColor: COLOR_SWATCH[c] }}
              />
            ))}
          </div>
        </div>

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
