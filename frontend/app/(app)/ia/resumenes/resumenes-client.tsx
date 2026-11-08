"use client";

import { motion } from "framer-motion";
import { FileQuestion, Plus, ScrollText, Sparkles } from "lucide-react";
import Link from "next/link";
import { ResumenCard } from "@/components/ia/resumen-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  COSTO_GENERAR_RESUMEN_IA,
  COSTO_GENERAR_TEST_IA,
} from "@/lib/economia";
import { staggerContainer } from "@/lib/motion";
import type { Resumen } from "@/lib/types";

export function ResumenesClient({ resumenes }: { resumenes: Resumen[] }) {
  const nuevo = (
    <Link
      href="/ia/resumenes/nuevo"
      className={`${buttonVariants({ size: "lg" })} bg-xp text-background hover:bg-xp/85`}
    >
      <Plus aria-hidden />
      Nuevo resumen
    </Link>
  );
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        tone="text-xp"
        eyebrow="Tu copiloto de estudio"
        title="Asistente IA"
        description="Convierte apuntes eternos en resúmenes claros o en tests para desafiar a tu grupo."
        actions={resumenes.length > 0 && nuevo}
      />

      <section className="grid gap-3 md:grid-cols-2">
        <Herramienta
          href="/ia/resumenes/nuevo"
          icon={ScrollText}
          titulo="Resumir un texto"
          texto="Pega tus apuntes y obtén las ideas clave."
          costo={COSTO_GENERAR_RESUMEN_IA}
        />
        <Herramienta
          href="/grupos"
          icon={FileQuestion}
          titulo="Generar un test"
          texto="Desde los tests de una materia, elige «Generar con IA»."
          costo={COSTO_GENERAR_TEST_IA}
        />
      </section>

      {resumenes.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          tono="text-xp"
          titulo="Tu biblioteca está vacía"
          texto="Todavía no has generado ningún resumen. Pega un texto y deja que la IA lo resuma por ti."
          action={nuevo}
        />
      ) : (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            Mis resúmenes{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({resumenes.length})
            </span>
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {resumenes.map((r) => (
              <ResumenCard key={r.id} resumen={r} />
            ))}
          </motion.div>
        </section>
      )}
    </div>
  );
}

function Herramienta({
  href,
  icon: Icon,
  titulo,
  texto,
  costo,
}: {
  href: string;
  icon: typeof Sparkles;
  titulo: string;
  texto: string;
  costo: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-xp/20 bg-gradient-to-br from-xp/10 via-card/70 to-card/40 p-4 transition-all hover:-translate-y-0.5 hover:border-xp/50"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-xp/15 text-xp">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-base font-semibold">
          {titulo}
        </span>
        <span className="block text-sm text-muted-foreground">{texto}</span>
      </span>
      <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-bold text-xp tabular">
        {costo} cr
      </span>
    </Link>
  );
}
