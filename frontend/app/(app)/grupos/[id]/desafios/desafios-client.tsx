"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { DesafioCard } from "@/components/desafios/desafio-card";
import {
  NuevoDesafioModal,
  type NuevoDesafioData,
} from "@/components/desafios/nuevo-desafio-modal";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { staggerContainer } from "@/lib/motion";
import type { DesafioOut } from "@/lib/types";

interface DesafiosClientProps {
  grupoId: string;
  initialDesafios: DesafioOut[];
  testsDisponibles: { id: string; titulo: string }[];
}

export function DesafiosClient({
  grupoId,
  initialDesafios,
  testsDisponibles,
}: DesafiosClientProps) {
  const [desafios, setDesafios] = useState(initialDesafios);
  const [showModal, setShowModal] = useState(false);

  async function handleCreate(data: NuevoDesafioData) {
    const nuevo = await apiFetchClient<DesafioOut>(
      `/api/grupos/${grupoId}/desafios`,
      { method: "POST", body: data },
    );
    setShowModal(false);
    setDesafios((prev) => [nuevo, ...prev]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Desafíos</h1>
        <Button onClick={() => setShowModal(true)}>Nuevo desafío</Button>
      </div>

      {desafios.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay desafíos en este grupo. Crea el primero eligiendo un test.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-4"
        >
          {desafios.map((d) => (
            <DesafioCard key={d.id} desafio={d} />
          ))}
        </motion.div>
      )}

      {showModal && (
        <NuevoDesafioModal
          tests={testsDisponibles}
          onSubmit={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
