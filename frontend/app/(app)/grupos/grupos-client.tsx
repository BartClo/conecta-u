"use client";

import { motion } from "framer-motion";
import { Crown, KeyRound, Plus, Swords, Users } from "lucide-react";
import { useState } from "react";
import { GrupoCard } from "@/components/grupos/grupo-card";
import { GrupoFormModal } from "@/components/grupos/grupo-form-modal";
import { UnirseGrupoModal } from "@/components/grupos/unirse-grupo-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import type { GrupoStats } from "@/lib/grupos";
import { apiFetchClient } from "@/lib/api-client";
import { staggerContainer } from "@/lib/motion";
import type { Grupo } from "@/lib/types";

export function GruposClient({
  initialGrupos,
  stats = {},
}: {
  initialGrupos: Grupo[];
  stats?: Record<string, GrupoStats>;
}) {
  const [grupos, setGrupos] = useState(initialGrupos);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showUnirseModal, setShowUnirseModal] = useState(false);

  async function handleCreate(data: { nombre: string; materia_id: string }) {
    const nuevo = await apiFetchClient<Grupo>("/api/grupos", {
      method: "POST",
      body: data,
    });
    setShowCrearModal(false);
    setGrupos((prev) => [nuevo, ...prev]);
  }

  async function handleUnirse(codigo: string) {
    const grupo = await apiFetchClient<Grupo>("/api/grupos/unirse", {
      method: "POST",
      body: { codigo },
    });
    setShowUnirseModal(false);
    setGrupos((prev) => [grupo, ...prev]);
  }

  const valores = Object.values(stats);
  const abiertos = valores.reduce((t, v) => t + v.abiertos, 0);
  const posiciones = valores.flatMap((v) => (v.posicion ? [v.posicion] : []));
  const mejor = posiciones.length ? Math.min(...posiciones) : null;
  const acciones = (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setShowUnirseModal(true)}
      >
        <KeyRound aria-hidden />
        Unirse con código
      </Button>
      <Button size="lg" onClick={() => setShowCrearModal(true)}>
        <Plus aria-hidden />
        Crear grupo
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="Donde se compite"
        title="Grupos"
        description="Tus salas de estudio: rinde desafíos, sube en el ranking y gana créditos."
        actions={grupos.length > 0 && acciones}
      />

      {grupos.length === 0 ? (
        <EmptyState
          icon={Users}
          titulo="Aún no estás en ningún grupo"
          texto="Todavía no perteneces a ningún grupo. Crea uno o únete con un código."
          action={acciones}
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Users}
              tono="text-primary"
              borde="from-primary/25"
              valor={grupos.length}
              etiqueta="Grupos"
              pie="en los que participas"
            />
            <StatCard
              icon={Swords}
              tono="text-cyan"
              borde="from-cyan/20"
              valor={abiertos}
              etiqueta="Desafíos abiertos"
              pie="entre todos tus grupos"
            />
            <StatCard
              icon={Crown}
              tono="text-gold"
              borde="from-gold/20"
              valor={mejor === null ? "—" : `#${mejor}`}
              etiqueta="Mejor posición"
              pie="en el ranking de un grupo"
            />
          </section>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {grupos.map((g) => (
              <GrupoCard key={g.id} grupo={g} stats={stats[g.id]} />
            ))}
          </motion.div>
        </>
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
