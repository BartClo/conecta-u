"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ScrollText } from "lucide-react";
import Link from "next/link";
import { staggerItem } from "@/lib/motion";
import type { Resumen } from "@/lib/types";

const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function ResumenCard({ resumen }: { resumen: Resumen }) {
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }}>
      <Link
        href={`/ia/resumenes/${resumen.id}`}
        className="group flex h-full flex-col gap-3 rounded-2xl border bg-card/70 p-4 transition-colors hover:border-xp/50 hover:shadow-[0_12px_40px_-18px_var(--xp)]"
      >
        <span className="flex items-start justify-between">
          <span className="grid size-10 place-items-center rounded-xl bg-xp/15 text-xp">
            <ScrollText className="size-5" aria-hidden />
          </span>
          <ArrowUpRight
            className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden
          />
        </span>
        <h2 className="font-heading text-lg font-semibold leading-tight">
          {resumen.titulo}
        </h2>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {resumen.contenido_resumen}
        </p>
        <span className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{new Date(resumen.created_at).toLocaleDateString("es")}</span>
          <span className="rounded-full bg-muted px-2 py-0.5">
            {palabras(resumen.contenido_resumen)} palabras
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
