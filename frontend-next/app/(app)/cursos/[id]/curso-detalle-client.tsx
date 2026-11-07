"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CursoFormModal } from "@/components/cursos/curso-form-modal";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { COLOR_SWATCH } from "@/lib/colors";
import type { Curso } from "@/lib/types";

export function CursoDetalleClient({ curso: initialCurso }: { curso: Curso }) {
  const router = useRouter();
  const [curso, setCurso] = useState(initialCurso);
  const [showEditModal, setShowEditModal] = useState(false);

  async function handleEdit(data: {
    nombre: string;
    codigo: string;
    profesor: string | null;
    color: string;
  }) {
    const actualizado = await apiFetchClient<Curso>(`/api/cursos/${curso.id}`, {
      method: "PUT",
      body: { ...data, semestre_id: curso.semestre_id },
    });
    setCurso(actualizado);
    setShowEditModal(false);
  }

  async function handleDelete() {
    if (!confirm(`¿Borrar el curso "${curso.nombre}"?`)) return;
    await apiFetchClient(`/api/cursos/${curso.id}`, { method: "DELETE" });
    router.push("/cursos");
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-4"
        style={{ borderLeft: `4px solid ${COLOR_SWATCH[curso.color]}` }}
      >
        <h1 className="text-xl font-semibold">{curso.nombre}</h1>
        <p className="text-muted-foreground">{curso.codigo}</p>
        {curso.profesor && (
          <p className="text-muted-foreground">{curso.profesor}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowEditModal(true)}>
          Editar
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Borrar
        </Button>
      </div>

      {showEditModal && (
        <CursoFormModal
          curso={curso}
          onSubmit={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
