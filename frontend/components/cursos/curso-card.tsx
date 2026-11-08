import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, UserRound } from "lucide-react";
import { COLOR_SWATCH } from "@/lib/colors";
import { staggerItem } from "@/lib/motion";
import type { Curso } from "@/lib/types";

export function CursoCard({ curso }: { curso: Curso }) {
  const color = COLOR_SWATCH[curso.color];
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }}>
      <Link
        href={`/cursos/${curso.id}`}
        className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border bg-card/70 p-4 transition-colors hover:border-foreground/20"
        style={{
          backgroundImage: `linear-gradient(135deg, ${color}26, transparent 60%)`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: color }}
          aria-hidden
        />
        <span className="flex items-start justify-between">
          <span
            className="rounded-lg px-2 py-1 font-mono text-xs font-bold"
            style={{ background: `${color}33`, color }}
          >
            {curso.codigo}
          </span>
          <ArrowUpRight
            className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden
          />
        </span>
        <h3 className="font-heading text-lg font-semibold leading-tight">
          {curso.nombre}
        </h3>
        {curso.profesor && (
          <p className="mt-auto flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden />
            {curso.profesor}
          </p>
        )}
      </Link>
    </motion.div>
  );
}
