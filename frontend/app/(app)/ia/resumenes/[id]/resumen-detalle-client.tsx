"use client";

import { motion } from "framer-motion";
import { CalendarDays, FileText, Minimize2, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { pageTransition } from "@/lib/motion";
import type { Resumen } from "@/lib/types";

const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function ResumenDetalleClient({ resumen }: { resumen: Resumen }) {
  const fuente = palabras(resumen.contenido_fuente);
  const corto = palabras(resumen.contenido_resumen);
  const ahorro = fuente
    ? Math.max(0, Math.round((1 - corto / fuente) * 100))
    : 0;

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <PageHeader
        back={{ href: "/ia/resumenes", label: "Volver a mis resúmenes" }}
        icon={ScrollText}
        tone="text-xp"
        eyebrow="Resumen generado con IA"
        title={resumen.titulo}
      />

      <div className="flex flex-wrap gap-2 text-xs font-medium">
        <span className="flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1">
          <CalendarDays className="size-3.5 text-primary" aria-hidden />
          {new Date(resumen.created_at).toLocaleDateString("es")}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1">
          <FileText className="size-3.5 text-cyan" aria-hidden />
          {fuente} → {corto} palabras
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-xp/15 px-3 py-1 text-xp">
          <Minimize2 className="size-3.5" aria-hidden />
          {ahorro}% más corto
        </span>
      </div>

      <article className="relative max-w-3xl overflow-hidden rounded-3xl border border-xp/20 bg-gradient-to-br from-xp/10 via-card/80 to-card/60 p-6 sm:p-8">
        <span
          className="absolute inset-y-6 left-0 w-1 rounded-r-full bg-xp"
          aria-hidden
        />
        <p className="whitespace-pre-wrap text-base leading-relaxed">
          {resumen.contenido_resumen}
        </p>
      </article>

      <details className="group max-w-3xl rounded-2xl border bg-card/50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          Ver texto original
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {resumen.contenido_fuente}
        </p>
      </details>
    </motion.div>
  );
}
