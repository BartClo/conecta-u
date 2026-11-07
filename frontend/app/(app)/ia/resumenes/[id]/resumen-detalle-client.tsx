"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { pageTransition } from "@/lib/motion";
import type { Resumen } from "@/lib/types";

export function ResumenDetalleClient({ resumen }: { resumen: Resumen }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      <Link
        href="/ia/resumenes"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Volver a mis resúmenes
      </Link>
      <h1 className="text-2xl font-semibold">{resumen.titulo}</h1>
      <p className="text-xs text-muted-foreground">
        {new Date(resumen.created_at).toLocaleDateString("es")}
      </p>
      <p className="whitespace-pre-wrap">{resumen.contenido_resumen}</p>
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Ver texto original
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-sm">
          {resumen.contenido_fuente}
        </p>
      </details>
    </motion.div>
  );
}
