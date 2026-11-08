import Link from "next/link";
import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  Hourglass,
  Lock,
  Swords,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { tiempoRestante } from "@/lib/dashboard";
import { puedeRendirse } from "@/lib/desafios";
import { staggerItem } from "@/lib/motion";
import type { DesafioOut } from "@/lib/types";

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DesafioCard({ desafio }: { desafio: DesafioOut }) {
  // Timezone- and clock-dependent values are computed after mount so the
  // server render and first client render match.
  const cliente = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const href = `/grupos/${desafio.grupo_id}/desafios/${desafio.id}`;
  const abierto = desafio.estado === "abierto";
  const rendible = cliente && !desafio.ya_rindio && puedeRendirse(desafio);

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -3 }}>
      <article
        className={`relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border p-4 transition-colors ${
          rendible
            ? "border-cyan/40 bg-gradient-to-br from-cyan/15 via-card/80 to-card/60 shadow-[0_10px_40px_-20px_var(--cyan)]"
            : "bg-card/70"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${
              abierto
                ? "bg-cyan/15 text-cyan"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {abierto ? (
              <Swords className="size-5" aria-hidden />
            ) : (
              <Lock className="size-5" aria-hidden />
            )}
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {desafio.ya_rindio && (
              <span className="flex items-center gap-1 rounded-full bg-xp/15 px-2 py-0.5 text-xs font-semibold text-xp">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Rendido
              </span>
            )}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                abierto
                  ? "bg-cyan/15 text-cyan"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${abierto ? "animate-pulse bg-cyan motion-reduce:animate-none" : "bg-muted-foreground"}`}
              />
              {desafio.estado}
            </span>
          </div>
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="font-heading text-lg font-semibold leading-tight">
            {desafio.test_titulo}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" aria-hidden />
            <span>
              {cliente ? fecha(desafio.fecha_inicio) : "…"} –{" "}
              {desafio.fecha_fin
                ? cliente
                  ? fecha(desafio.fecha_fin)
                  : "…"
                : "sin límite"}
            </span>
          </p>
          {abierto && cliente && desafio.fecha_fin && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-gold">
              <Hourglass className="size-3.5" aria-hidden />
              {tiempoRestante(desafio.fecha_fin)}
            </p>
          )}
        </div>
        <div className="mt-auto">
          {desafio.ya_rindio ? (
            <Link
              href={href}
              className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full`}
            >
              Ver resultado
            </Link>
          ) : rendible ? (
            <Link
              href={href}
              className={`${buttonVariants({ size: "lg" })} w-full bg-cyan text-background hover:bg-cyan/85`}
            >
              Rendir
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`${buttonVariants({ variant: "outline", size: "lg" })} pointer-events-none w-full opacity-50`}
            >
              Cerrado
            </span>
          )}
        </div>
      </article>
    </motion.div>
  );
}
