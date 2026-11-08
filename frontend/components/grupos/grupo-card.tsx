import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Crown, Swords, Users } from "lucide-react";
import { AvatarStack } from "@/components/shared/avatar";
import type { GrupoStats } from "@/lib/grupos";
import { staggerItem } from "@/lib/motion";
import type { Grupo } from "@/lib/types";

export function GrupoCard({
  grupo,
  stats,
}: {
  grupo: Grupo;
  stats?: GrupoStats;
}) {
  const n = stats?.miembros.length ?? 0;
  const abiertos = stats?.abiertos ?? 0;
  const pos = stats?.posicion ?? null;
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }}>
      <Link
        href={`/grupos/${grupo.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/70 transition-colors hover:border-primary/50 hover:shadow-[0_12px_40px_-16px_var(--primary)]"
      >
        <span className="relative block h-20 overflow-hidden bg-gradient-to-br from-primary/35 via-primary/10 to-cyan/10">
          <span className="bg-grid absolute inset-0 opacity-60" />
          <span className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/30 blur-2xl" />
          <span className="absolute left-4 top-3 rounded-full border border-gold/30 bg-background/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold backdrop-blur">
            {grupo.materia_nombre}
          </span>
          <ArrowUpRight
            className="absolute right-3 top-3 size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden
          />
        </span>
        <span className="flex flex-1 flex-col gap-4 p-4">
          <span className="truncate font-heading text-lg font-semibold">
            {grupo.nombre}
          </span>
          <span className="flex items-center gap-3">
            {n > 0 && <AvatarStack nombres={stats!.miembros} />}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              {n} {n === 1 ? "miembro" : "miembros"}
            </span>
          </span>
          <span className="mt-auto flex flex-wrap gap-2 text-xs font-medium">
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${abiertos ? "bg-cyan/15 text-cyan" : "bg-muted text-muted-foreground"}`}
            >
              <Swords className="size-3.5" aria-hidden />
              {abiertos}{" "}
              {abiertos === 1 ? "desafío abierto" : "desafíos abiertos"}
            </span>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${pos === null ? "bg-muted text-muted-foreground" : pos <= 3 ? "bg-gold/15 text-gold" : "bg-primary/15 text-primary"}`}
            >
              <Crown className="size-3.5" aria-hidden />
              {pos === null
                ? "Sin ranking aún"
                : `#${pos} de ${stats!.participantes}`}
            </span>
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
