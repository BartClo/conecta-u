import Link from "next/link";
import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <motion.div variants={staggerItem}>
      <Card className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{desafio.test_titulo}</h3>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              abierto ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {desafio.estado}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {cliente ? fecha(desafio.fecha_inicio) : "…"} –{" "}
          {desafio.fecha_fin
            ? cliente
              ? fecha(desafio.fecha_fin)
              : "…"
            : "sin límite"}
        </p>
        {desafio.ya_rindio ? (
          <Link href={href} className={buttonVariants({ variant: "outline" })}>
            Ver resultado
          </Link>
        ) : cliente && puedeRendirse(desafio) ? (
          <Link href={href} className={buttonVariants()}>
            Rendir
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${buttonVariants({ variant: "outline" })} pointer-events-none opacity-50`}
          >
            Cerrado
          </span>
        )}
      </Card>
    </motion.div>
  );
}
