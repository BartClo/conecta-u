import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { staggerItem } from "@/lib/motion";
import type { Grupo } from "@/lib/types";

export function GrupoCard({ grupo }: { grupo: Grupo }) {
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4 }}>
      <Link href={`/grupos/${grupo.id}`}>
        <Card className="p-4">
          <h3 className="font-semibold">{grupo.nombre}</h3>
          <p className="text-sm text-muted-foreground">
            {grupo.materia_nombre}
          </p>
        </Card>
      </Link>
    </motion.div>
  );
}
