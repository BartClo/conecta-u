"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { GrupoCard } from "@/components/grupos/grupo-card";
import { GrupoFormModal } from "@/components/grupos/grupo-form-modal";
import { UnirseGrupoModal } from "@/components/grupos/unirse-grupo-modal";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { staggerContainer } from "@/lib/motion";
import type { Grupo } from "@/lib/types";

export function GruposClient({ initialGrupos }: { initialGrupos: Grupo[] }) {
  const [grupos, setGrupos] = useState(initialGrupos);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showUnirseModal, setShowUnirseModal] = useState(false);

  async function handleCreate(data: { nombre: string; materia_id: string }) {
    const nuevo = await apiFetchClient<Grupo>("/api/grupos", {
      method: "POST",
      body: data,
    });
    setShowCrearModal(false);
    setGrupos((prev) => [...prev, nuevo]);
  }

  async function handleUnirse(codigo: string) {
    const grupo = await apiFetchClient<Grupo>("/api/grupos/unirse", {
      method: "POST",
      body: { codigo },
    });
    setShowUnirseModal(false);
    setGrupos((prev) => [...prev, grupo]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Grupos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUnirseModal(true)}>
            Unirse con código
          </Button>
          <Button onClick={() => setShowCrearModal(true)}>Crear grupo</Button>
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no perteneces a ningún grupo. Crea uno o únete con un código.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-4"
        >
          {grupos.map((g) => (
            <GrupoCard key={g.id} grupo={g} />
          ))}
        </motion.div>
      )}

      {showCrearModal && (
        <GrupoFormModal
          onSubmit={handleCreate}
          onClose={() => setShowCrearModal(false)}
        />
      )}
      {showUnirseModal && (
        <UnirseGrupoModal
          onSubmit={handleUnirse}
          onClose={() => setShowUnirseModal(false)}
        />
      )}
    </div>
  );
}
