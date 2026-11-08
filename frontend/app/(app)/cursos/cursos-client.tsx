"use client";

import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CursoCard } from "@/components/cursos/curso-card";
import { CursoFormModal } from "@/components/cursos/curso-form-modal";
import { SemestreFormModal } from "@/components/cursos/semestre-form-modal";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { semestreActivo } from "@/lib/semestre";
import { staggerContainer } from "@/lib/motion";
import type { Curso, Semestre } from "@/lib/types";

interface CursosClientProps {
  initialSemestres: Semestre[];
  initialCursos: Curso[];
}

export function CursosClient({
  initialSemestres,
  initialCursos,
}: CursosClientProps) {
  const [semestres, setSemestres] = useState(initialSemestres);
  const [semestreId, setSemestreId] = useState(
    semestreActivo(initialSemestres)?.id ?? null,
  );
  const [cursos, setCursos] = useState(initialCursos);
  const [showSemestreModal, setShowSemestreModal] = useState(false);
  const [showCursoModal, setShowCursoModal] = useState(false);

  async function reloadCursos(id: string) {
    const data = await apiFetchClient<Curso[]>(`/api/cursos?semestre_id=${id}`);
    setCursos(data);
  }

  async function handleSelectSemestre(id: string) {
    setSemestreId(id);
    await reloadCursos(id);
  }

  async function handleCreateSemestre(data: {
    nombre: string;
    fecha_inicio: string;
    fecha_fin: string;
  }) {
    const nuevo = await apiFetchClient<Semestre>("/api/semestres", {
      method: "POST",
      body: data,
    });
    setShowSemestreModal(false);
    setSemestres((prev) => [...prev, nuevo]);
    setSemestreId(nuevo.id);
    setCursos([]);
  }

  async function handleCreateCurso(data: {
    nombre: string;
    codigo: string;
    profesor: string | null;
    color: string;
  }) {
    if (!semestreId) return;
    const nuevo = await apiFetchClient<Curso>("/api/cursos", {
      method: "POST",
      body: { ...data, semestre_id: semestreId },
    });
    setShowCursoModal(false);
    setCursos((prev) => [...prev, nuevo]);
  }

  const semestre = semestres.find((s) => s.id === semestreId);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        tone="text-cyan"
        eyebrow={semestre ? `Semestre ${semestre.nombre}` : "Tu malla"}
        title="Cursos"
        description="Organiza los ramos de cada semestre; aparecen en tu calendario y en tu constelación."
        actions={
          <>
            {semestres.length > 0 && (
              <label className="flex items-center gap-2 rounded-xl border bg-card/70 px-3 py-1.5 text-sm">
                <GraduationCap className="size-4 text-cyan" aria-hidden />
                <select
                  aria-label="Semestre"
                  value={semestreId ?? ""}
                  onChange={(e) => handleSelectSemestre(e.target.value)}
                  className="cursor-pointer bg-transparent py-1 font-medium outline-none"
                >
                  {semestres.map((s) => (
                    <option key={s.id} value={s.id} className="bg-popover">
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowSemestreModal(true)}
            >
              + Nuevo semestre
            </Button>
            {semestreId && (
              <Button size="lg" onClick={() => setShowCursoModal(true)}>
                <Plus aria-hidden />
                Nuevo curso
              </Button>
            )}
          </>
        }
      />

      {semestres.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          tono="text-cyan"
          titulo="Empecemos por el semestre"
          texto="Crea tu primer semestre para empezar a agregar cursos."
        />
      ) : cursos.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          tono="text-cyan"
          titulo="Semestre sin cursos"
          texto="Agrega tus ramos con «Nuevo curso» para verlos aquí y en tu calendario."
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {cursos.map((c) => (
            <CursoCard key={c.id} curso={c} />
          ))}
        </motion.div>
      )}

      {showSemestreModal && (
        <SemestreFormModal
          onSubmit={handleCreateSemestre}
          onClose={() => setShowSemestreModal(false)}
        />
      )}
      {showCursoModal && (
        <CursoFormModal
          onSubmit={handleCreateCurso}
          onClose={() => setShowCursoModal(false)}
        />
      )}
    </div>
  );
}
