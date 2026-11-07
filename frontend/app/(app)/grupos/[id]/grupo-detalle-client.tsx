"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GrupoFormModal } from "@/components/grupos/grupo-form-modal";
import { Leaderboard } from "@/components/ranking/leaderboard";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import type {
  Grupo,
  GrupoDetalle,
  LeaderboardEntry,
  Miembro,
} from "@/lib/types";

interface GrupoDetalleClientProps {
  grupo: GrupoDetalle;
  miembros: Miembro[];
  leaderboard: LeaderboardEntry[];
  userId: string;
}

export function GrupoDetalleClient({
  grupo: initialGrupo,
  miembros: initialMiembros,
  leaderboard,
  userId,
}: GrupoDetalleClientProps) {
  const router = useRouter();
  const [grupo, setGrupo] = useState(initialGrupo);
  const [miembros, setMiembros] = useState(initialMiembros);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = grupo.rol === "owner";

  // Safety net only: the UI hides actions by role, the backend is the authority.
  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    }
  }

  async function handleEdit(data: { nombre: string }) {
    const actualizado = await apiFetchClient<Grupo>(`/api/grupos/${grupo.id}`, {
      method: "PUT",
      body: { nombre: data.nombre },
    });
    setGrupo((prev) => ({ ...prev, ...actualizado }));
    setShowEditModal(false);
  }

  function handleCopy() {
    return run(async () => {
      await navigator.clipboard.writeText(grupo.codigo_invitacion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  function handleRegenerar() {
    if (!confirm("¿Regenerar el código? El código actual dejará de funcionar."))
      return;
    return run(async () => {
      const actualizado = await apiFetchClient<Grupo>(
        `/api/grupos/${grupo.id}/codigo`,
        { method: "POST" },
      );
      setGrupo((prev) => ({ ...prev, ...actualizado }));
    });
  }

  function handleExpulsar(m: Miembro) {
    if (!confirm(`¿Expulsar a ${m.nombre ?? m.email}?`)) return;
    return run(async () => {
      try {
        await apiFetchClient(`/api/grupos/${grupo.id}/miembros/${m.user_id}`, {
          method: "DELETE",
        });
      } catch (err) {
        // 404: already gone, which is what we wanted.
        if (!(err instanceof Error && err.message.endsWith("404"))) throw err;
      }
      setMiembros((prev) => prev.filter((x) => x.user_id !== m.user_id));
      setGrupo((prev) => ({
        ...prev,
        miembros_count: prev.miembros_count - 1,
      }));
      // Kicking rotates the invite code: refetch to show the new one.
      const fresco = await apiFetchClient<GrupoDetalle>(
        `/api/grupos/${grupo.id}`,
      );
      setGrupo((prev) => ({ ...prev, ...fresco }));
    });
  }

  function handleSalir() {
    if (!confirm(`¿Salir del grupo "${grupo.nombre}"?`)) return;
    return run(async () => {
      await apiFetchClient(`/api/grupos/${grupo.id}/miembros/${userId}`, {
        method: "DELETE",
      });
      router.push("/grupos");
    });
  }

  function handleDelete() {
    if (!confirm(`¿Borrar el grupo "${grupo.nombre}"?`)) return;
    return run(async () => {
      await apiFetchClient(`/api/grupos/${grupo.id}`, { method: "DELETE" });
      router.push("/grupos");
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <h1 className="text-xl font-semibold">{grupo.nombre}</h1>
        <p className="text-muted-foreground">{grupo.materia_nombre}</p>
        <p className="text-sm text-muted-foreground">
          {grupo.miembros_count}{" "}
          {grupo.miembros_count === 1 ? "miembro" : "miembros"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/materias/${grupo.materia_id}/tests`}
          className={buttonVariants({ variant: "outline" })}
        >
          Tests de la materia
        </Link>
        <Link
          href={`/grupos/${grupo.id}/desafios`}
          className={buttonVariants({ variant: "outline" })}
        >
          Desafíos
        </Link>
        {isOwner && (
          <>
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              Editar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Borrar grupo
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">Código de invitación</h2>
        <p className="font-mono text-2xl tracking-widest">
          {grupo.codigo_invitacion}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copiado ? "¡Copiado!" : "Copiar"}
          </Button>
          {isOwner && (
            <Button variant="outline" size="sm" onClick={handleRegenerar}>
              Regenerar código
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Miembros</h2>
        <ul className="space-y-2">
          {miembros.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between rounded-lg border p-2"
            >
              <span>
                {m.nombre ?? m.email}{" "}
                <span className="rounded bg-muted px-2 py-0.5 text-xs">
                  {m.rol}
                </span>
              </span>
              {isOwner && m.rol !== "owner" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleExpulsar(m)}
                >
                  Expulsar
                </Button>
              )}
              {!isOwner && m.user_id === userId && (
                <Button variant="outline" size="sm" onClick={handleSalir}>
                  Salir del grupo
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Ranking del grupo</h2>
        <Leaderboard
          entries={leaderboard}
          vacio="Todavía no hay resultados en este grupo."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showEditModal && (
        <GrupoFormModal
          grupo={grupo}
          onSubmit={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
