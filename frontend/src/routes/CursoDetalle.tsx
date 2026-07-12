import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CursoFormModal from "../components/CursoFormModal";
import { apiFetch } from "../lib/api";
import { COLOR_SWATCH } from "../lib/colors";
import type { Curso } from "../lib/types";

export default function CursoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<Curso>(`/api/cursos/${id}`)
      .then(setCurso)
      .catch(() => setNotFound(true));
  }, [id]);

  function handleEdit(data: { nombre: string; codigo: string; profesor: string | null; color: string }) {
    if (!curso) return;
    apiFetch<Curso>(`/api/cursos/${curso.id}`, {
      method: "PUT",
      body: { ...data, semestre_id: curso.semestre_id },
    }).then((actualizado) => {
      setCurso(actualizado);
      setShowEditModal(false);
    });
  }

  function handleDelete() {
    if (!curso) return;
    if (!confirm(`¿Borrar el curso "${curso.nombre}"?`)) return;
    apiFetch(`/api/cursos/${curso.id}`, { method: "DELETE" }).then(() => navigate("/cursos"));
  }

  if (notFound) return <p className="p-6 text-gray-500">Curso no encontrado.</p>;
  if (!curso) return null;

  return (
    <div className="p-6">
      <div
        className="rounded border p-4"
        style={{ borderLeft: `4px solid ${COLOR_SWATCH[curso.color]}` }}
      >
        <h1 className="text-xl font-semibold">{curso.nombre}</h1>
        <p className="text-gray-500">{curso.codigo}</p>
        {curso.profesor && <p className="text-gray-500">{curso.profesor}</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => setShowEditModal(true)} className="rounded border px-3 py-1">
          Editar
        </button>
        <button onClick={handleDelete} className="rounded border border-red-600 px-3 py-1 text-red-600">
          Borrar
        </button>
      </div>

      {showEditModal && (
        <CursoFormModal curso={curso} onSubmit={handleEdit} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
}
