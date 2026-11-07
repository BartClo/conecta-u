"use client";

import { motion } from "framer-motion";
import { useState } from "react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={semestreId ?? ""}
            onChange={(e) => handleSelectSemestre(e.target.value)}
            className="rounded border bg-background px-2 py-1"
          >
            {semestres.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <Button variant="link" onClick={() => setShowSemestreModal(true)}>
            + Nuevo semestre
          </Button>
        </div>
        {semestreId && (
          <Button onClick={() => setShowCursoModal(true)}>Nuevo curso</Button>
        )}
      </div>

      {semestres.length === 0 ? (
        <p className="text-muted-foreground">
          Crea tu primer semestre para empezar a agregar cursos.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-4"
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
