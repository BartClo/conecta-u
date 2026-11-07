"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TestCard } from "@/components/tests/test-card";
import { buttonVariants } from "@/components/ui/button";
import { staggerContainer } from "@/lib/motion";
import type { Test } from "@/lib/types";

interface TestsClientProps {
  materiaId: string;
  tests: Test[];
  userId: string;
}

export function TestsClient({ materiaId, tests, userId }: TestsClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tests de la materia</h1>
        <div className="flex gap-2">
          <Link
            href={`/materias/${materiaId}/tests/nuevo-ia`}
            className={buttonVariants({ variant: "outline" })}
          >
            Generar con IA
          </Link>
          <Link
            href={`/materias/${materiaId}/tests/nuevo`}
            className={buttonVariants()}
          >
            Crear test
          </Link>
        </div>
      </div>

      {tests.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay tests para esta materia. Crea el primero.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-4"
        >
          {tests.map((t) => (
            <TestCard key={t.id} test={t} userId={userId} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
