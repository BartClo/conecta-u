"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ResumenCard } from "@/components/ia/resumen-card";
import { buttonVariants } from "@/components/ui/button";
import { staggerContainer } from "@/lib/motion";
import type { Resumen } from "@/lib/types";

export function ResumenesClient({ resumenes }: { resumenes: Resumen[] }) {
  const nuevo = (
    <Link href="/ia/resumenes/nuevo" className={buttonVariants()}>
      Nuevo resumen
    </Link>
  );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Asistente IA</h1>
        {resumenes.length > 0 && nuevo}
      </div>
      {resumenes.length === 0 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            Todavía no has generado ningún resumen. Pega un texto y deja que la
            IA lo resuma por ti.
          </p>
          {nuevo}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-4"
        >
          {resumenes.map((r) => (
            <ResumenCard key={r.id} resumen={r} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
