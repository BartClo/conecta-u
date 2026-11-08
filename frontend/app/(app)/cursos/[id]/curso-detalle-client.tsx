"use client";

import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
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

  const color = COLOR_SWATCH[curso.color];

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border p-6 lg:p-8"
        style={{
          backgroundImage: `linear-gradient(135deg, ${color}40, transparent 70%)`,
        }}
      >
        <span className="bg-grid absolute inset-0 opacity-40" aria-hidden />
        <span
          className="absolute inset-y-0 left-0 w-1.5"
          style={{ background: color }}
          aria-hidden
        />
        <div className="relative space-y-3">
          <Link
            href="/cursos"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Mis cursos
          </Link>
          <p
            className="w-fit rounded-lg px-2 py-1 font-mono text-xs font-bold"
            style={{ background: `${color}33`, color }}
          >
            {curso.codigo}
          </p>
          <h1 className="font-heading text-4xl font-bold tracking-tight break-words">
            {curso.nombre}
          </h1>
          {curso.profesor && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <UserRound className="size-4" aria-hidden />
              {curso.profesor}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowEditModal(true)}
            >
              <Pencil aria-hidden />
              Editar
            </Button>
            <Button variant="destructive" size="lg" onClick={handleDelete}>
              <Trash2 aria-hidden />
              Borrar
            </Button>
          </div>
        </div>
      </section>

      <Link
        href="/calendario"
        className="flex items-center gap-4 rounded-2xl border bg-card/70 p-4 transition-colors hover:border-cyan/50"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-cyan/15 text-cyan">
          <CalendarDays className="size-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block font-heading font-semibold">
            Agenda sus evaluaciones
          </span>
          <span className="block text-sm text-muted-foreground">
            Crea exámenes, entregas y clases del curso en tu calendario.
          </span>
        </span>
      </Link>

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
