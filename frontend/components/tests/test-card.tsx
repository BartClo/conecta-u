import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { staggerItem } from "@/lib/motion";
import type { Test } from "@/lib/types";

export function TestCard({ test, userId }: { test: Test; userId: string }) {
  const n = test.preguntas.length;
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }}>
      <Link href={`/materias/${test.materia_id}/tests/${test.id}`}>
        <Card className="space-y-1 p-4">
          <h3 className="font-semibold">{test.titulo}</h3>
          {test.descripcion && (
            <p className="truncate text-sm text-muted-foreground">
              {test.descripcion}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {n} {n === 1 ? "pregunta" : "preguntas"} ·{" "}
            {test.autor_id === userId ? "Tú" : "Otro autor"}
          </p>
        </Card>
      </Link>
    </motion.div>
  );
}
