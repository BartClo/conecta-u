import { useEffect, useState } from "react";
import CursoCard from "../components/CursoCard";
import CursoFormModal from "../components/CursoFormModal";
import SemestreFormModal from "../components/SemestreFormModal";
import { apiFetch } from "../lib/api";
import { semestreActivo } from "../lib/semestre";
import type { Curso, Semestre } from "../lib/types";

export default function Cursos() {
  const [semestres, setSemestres] = useState<Semestre[]>([]);
  const [semestreId, setSemestreId] = useState<string | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [showSemestreModal, setShowSemestreModal] = useState(false);
  const [showCursoModal, setShowCursoModal] = useState(false);

  function reloadSemestres() {
    apiFetch<Semestre[]>("/api/semestres").then((data) => {
      setSemestres(data);
      setSemestreId((current) => current ?? semestreActivo(data)?.id ?? null);
    });
  }

  useEffect(reloadSemestres, []);

  useEffect(() => {
    if (!semestreId) {
      setCursos([]);
      return;
    }
    apiFetch<Curso[]>(`/api/cursos?semestre_id=${semestreId}`).then(setCursos);
  }, [semestreId]);

  function handleCreateSemestre(data: { nombre: string; fecha_inicio: string; fecha_fin: string }) {
    apiFetch<Semestre>("/api/semestres", { method: "POST", body: data }).then((nuevo) => {
      setShowSemestreModal(false);
      setSemestres((prev) => [...prev, nuevo]);
      setSemestreId(nuevo.id);
    });
  }

  function handleCreateCurso(data: {
    nombre: string;
    codigo: string;
    profesor: string | null;
    color: string;
  }) {
    if (!semestreId) return;
    apiFetch<Curso>("/api/cursos", {
      method: "POST",
      body: { ...data, semestre_id: semestreId },
    }).then((nuevo) => {
      setShowCursoModal(false);
      setCursos((prev) => [...prev, nuevo]);
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={semestreId ?? ""}
            onChange={(e) => setSemestreId(e.target.value || null)}
            className="rounded border px-2 py-1"
          >
            {semestres.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <button onClick={() => setShowSemestreModal(true)} className="text-sm text-blue-600">
            + Nuevo semestre
          </button>
        </div>
        {semestreId && (
          <button
            onClick={() => setShowCursoModal(true)}
            className="rounded bg-blue-600 px-3 py-1 text-white"
          >
            Nuevo curso
          </button>
        )}
      </div>

      {semestres.length === 0 ? (
        <p className="mt-6 text-gray-500">Crea tu primer semestre para empezar a agregar cursos.</p>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {cursos.map((c) => (
            <CursoCard key={c.id} curso={c} />
          ))}
        </div>
      )}

      {showSemestreModal && (
        <SemestreFormModal
          onSubmit={handleCreateSemestre}
          onClose={() => setShowSemestreModal(false)}
        />
      )}
      {showCursoModal && (
        <CursoFormModal onSubmit={handleCreateCurso} onClose={() => setShowCursoModal(false)} />
      )}
    </div>
  );
}
