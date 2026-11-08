"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Lock, Plus, Swords } from "lucide-react";
import { useState } from "react";
import { DesafioCard } from "@/components/desafios/desafio-card";
import {
  NuevoDesafioModal,
  type NuevoDesafioData,
} from "@/components/desafios/nuevo-desafio-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { staggerContainer } from "@/lib/motion";
import type { DesafioOut } from "@/lib/types";

interface DesafiosClientProps {
  grupoId: string;
  grupoNombre?: string;
  initialDesafios: DesafioOut[];
  testsDisponibles: { id: string; titulo: string }[];
}

export function DesafiosClient({
  grupoId,
  grupoNombre,
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

  const abiertos = desafios.filter((d) => d.estado === "abierto");
  const cerrados = desafios.filter((d) => d.estado !== "abierto");
  const rendidos = desafios.filter((d) => d.ya_rindio).length;
  const nuevo = (
    <Button size="lg" onClick={() => setShowModal(true)}>
      <Plus aria-hidden />
      Nuevo desafío
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/grupos/${grupoId}`, label: grupoNombre ?? "Grupo" }}
        icon={Swords}
        tone="text-cyan"
        eyebrow="Arena del grupo"
        title="Desafíos"
        description="Rinde el test más rápido y con más aciertos para llevarte los créditos."
        actions={desafios.length > 0 && nuevo}
      />

      {desafios.length === 0 ? (
        <EmptyState
          icon={Swords}
          tono="text-cyan"
          titulo="La arena está vacía"
          texto="Aún no hay desafíos en este grupo. Crea el primero eligiendo un test."
          action={nuevo}
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Swords}
              tono="text-cyan"
              borde="from-cyan/20"
              valor={abiertos.length}
              etiqueta="Abiertos"
              pie="aceptando intentos"
            />
            <StatCard
              icon={CheckCircle2}
              tono="text-xp"
              borde="from-xp/15"
              valor={rendidos}
              etiqueta="Rendidos por ti"
              pie={`de ${desafios.length} en total`}
            />
            <StatCard
              icon={Lock}
              tono="text-muted-foreground"
              borde="from-muted"
              valor={cerrados.length}
              etiqueta="Cerrados"
              pie="con ganador decidido"
            />
          </section>
          <Seccion titulo="En juego" lista={abiertos} />
          <Seccion titulo="Finalizados" lista={cerrados} />
        </>
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

function Seccion({ titulo, lista }: { titulo: string; lista: DesafioOut[] }) {
  if (lista.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold">
        {titulo}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          ({lista.length})
        </span>
      </h2>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {lista.map((d) => (
          <DesafioCard key={d.id} desafio={d} />
        ))}
      </motion.div>
    </section>
  );
}
