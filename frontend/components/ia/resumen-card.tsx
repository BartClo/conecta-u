"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { staggerItem } from "@/lib/motion";
import type { Resumen } from "@/lib/types";

export function ResumenCard({ resumen }: { resumen: Resumen }) {
  return (
    <motion.div variants={staggerItem}>
      <Link href={`/ia/resumenes/${resumen.id}`}>
        <Card className="space-y-2 p-4 hover:border-primary">
          <h2 className="font-semibold">{resumen.titulo}</h2>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {resumen.contenido_resumen}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(resumen.created_at).toLocaleDateString("es")}
          </p>
        </Card>
      </Link>
    </motion.div>
  );
}
