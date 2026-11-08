import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, FileQuestion, Sparkles } from "lucide-react";
import { staggerItem } from "@/lib/motion";
import type { Test } from "@/lib/types";

export function TestCard({ test, userId }: { test: Test; userId: string }) {
  const n = test.preguntas.length;
  const ia = test.origen === "ia";
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }}>
      <Link
        href={`/materias/${test.materia_id}/tests/${test.id}`}
        className="group flex h-full flex-col gap-3 rounded-2xl border bg-card/70 p-4 transition-colors hover:border-primary/50 hover:shadow-[0_12px_40px_-18px_var(--primary)]"
      >
        <span className="flex items-start justify-between">
          <span
            className={`grid size-11 place-items-center rounded-xl ${ia ? "bg-xp/15 text-xp" : "bg-primary/15 text-primary"}`}
          >
            {ia ? (
              <Sparkles className="size-5" aria-hidden />
            ) : (
              <FileQuestion className="size-5" aria-hidden />
            )}
          </span>
          <span className="flex items-center gap-2">
            {ia && (
              <span className="rounded-full bg-xp/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-xp">
                IA
              </span>
            )}
            <ArrowUpRight
              className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
              aria-hidden
            />
          </span>
        </span>
        <span className="font-heading text-lg font-semibold leading-tight">
          {test.titulo}
        </span>
        {test.descripcion && (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {test.descripcion}
          </span>
        )}
        <span className="mt-auto flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${test.autor_id === userId ? "bg-primary" : "bg-cyan"}`}
          />
          <span>
            {n} {n === 1 ? "pregunta" : "preguntas"} ·{" "}
            {test.autor_id === userId ? "Tú" : "Otro autor"}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
