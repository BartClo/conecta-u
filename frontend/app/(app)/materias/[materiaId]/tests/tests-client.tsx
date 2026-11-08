"use client";

import { motion } from "framer-motion";
import { FileQuestion, Plus, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { TestCard } from "@/components/tests/test-card";
import { buttonVariants } from "@/components/ui/button";
import { staggerContainer } from "@/lib/motion";
import type { Test } from "@/lib/types";

interface TestsClientProps {
  materiaId: string;
  materiaNombre?: string;
  tests: Test[];
  userId: string;
}

export function TestsClient({
  materiaId,
  materiaNombre,
  tests,
  userId,
}: TestsClientProps) {
  const acciones = (
    <>
      <Link
        href={`/materias/${materiaId}/tests/nuevo-ia`}
        className={`${buttonVariants({ variant: "outline", size: "lg" })} border-xp/40 text-xp`}
      >
        <Sparkles aria-hidden />
        Generar con IA
      </Link>
      <Link
        href={`/materias/${materiaId}/tests/nuevo`}
        className={buttonVariants({ size: "lg" })}
      >
        <Plus aria-hidden />
        Crear test
      </Link>
    </>
  );
  const mios = tests.filter((t) => t.autor_id === userId).length;
  const ia = tests.filter((t) => t.origen === "ia").length;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/grupos", label: "Grupos" }}
        icon={FileQuestion}
        eyebrow={materiaNombre ?? "Banco de preguntas"}
        title="Tests de la materia"
        description="Practica, crea los tuyos o deja que la IA arme uno por ti. Cualquier test puede convertirse en desafío."
        actions={tests.length > 0 && acciones}
      />

      {tests.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          titulo="El banco está vacío"
          texto="Todavía no hay tests para esta materia. Crea el primero."
          action={acciones}
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={FileQuestion}
              tono="text-primary"
              borde="from-primary/25"
              valor={tests.length}
              etiqueta="Tests"
              pie="disponibles en la materia"
            />
            <StatCard
              icon={UserRound}
              tono="text-cyan"
              borde="from-cyan/20"
              valor={mios}
              etiqueta="Creados por ti"
              pie="puedes editarlos"
            />
            <StatCard
              icon={Sparkles}
              tono="text-xp"
              borde="from-xp/15"
              valor={ia}
              etiqueta="Generados con IA"
              pie="en segundos"
            />
          </section>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {tests.map((t) => (
              <TestCard key={t.id} test={t} userId={userId} />
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
