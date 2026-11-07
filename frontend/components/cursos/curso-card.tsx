import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { COLOR_SWATCH } from "@/lib/colors";
import { staggerItem } from "@/lib/motion";
import type { Curso } from "@/lib/types";

export function CursoCard({ curso }: { curso: Curso }) {
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }}>
      <Link href={`/cursos/${curso.id}`}>
        <Card
          className="p-4"
          style={{ borderLeft: `4px solid ${COLOR_SWATCH[curso.color]}` }}
        >
          <h3 className="font-semibold">{curso.nombre}</h3>
          <p className="text-sm text-muted-foreground">{curso.codigo}</p>
          {curso.profesor && (
            <p className="text-sm text-muted-foreground">{curso.profesor}</p>
          )}
        </Card>
      </Link>
    </motion.div>
  );
}
