"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Crown,
  FileQuestion,
  KeyRound,
  LogOut,
  Pencil,
  RefreshCw,
  Swords,
  Trash2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GrupoFormModal } from "@/components/grupos/grupo-form-modal";
import { Leaderboard } from "@/components/ranking/leaderboard";
import { Avatar, AvatarStack } from "@/components/shared/avatar";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
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
      // El ranking viene del servidor y tambien excluye al expulsado.
      router.refresh();
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
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/25 via-card/80 to-cyan/10 p-6 lg:p-8">
        <span className="bg-grid absolute inset-0 opacity-50" aria-hidden />
        <span
          className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0 space-y-3">
            <Link
              href="/grupos"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Volver a grupos
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              {grupo.materia_nombre}
            </p>
            <h1 className="font-heading text-4xl font-bold tracking-tight break-words lg:text-5xl">
              {grupo.nombre}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <AvatarStack nombres={miembros.map((m) => m.nombre ?? m.email)} />
              <span className="text-sm text-muted-foreground">
                {grupo.miembros_count}{" "}
                {grupo.miembros_count === 1 ? "miembro" : "miembros"}
              </span>
              {isOwner && (
                <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">
                  <Crown className="size-3.5" aria-hidden />
                  Eres el dueño
                </span>
              )}
            </div>
            {isOwner && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                >
                  <Pencil aria-hidden />
                  Editar
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 aria-hidden />
                  Borrar grupo
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-xp/30 bg-background/60 p-5 backdrop-blur lg:min-w-72">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-xp">
              <KeyRound className="size-3.5" aria-hidden />
              Código de invitación
            </h2>
            <p className="my-3 font-mono text-4xl font-bold tracking-[0.25em] text-foreground drop-shadow-[0_0_18px_var(--xp)]">
              {grupo.codigo_invitacion}
            </p>
            <div className="flex gap-2">
              <Button size="lg" onClick={handleCopy} className="flex-1">
                {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copiado ? "¡Copiado!" : "Copiar"}
              </Button>
              {isOwner && (
                <Button variant="outline" size="lg" onClick={handleRegenerar}>
                  <RefreshCw aria-hidden />
                  Regenerar código
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <nav aria-label="Accesos del grupo" className="grid gap-3 sm:grid-cols-2">
        <Acceso
          href={`/grupos/${grupo.id}/desafios`}
          icon={Swords}
          titulo="Desafíos"
          texto="Compite contra tu grupo y gana créditos"
          clase="border-cyan/25 from-cyan/15 text-cyan hover:border-cyan/60"
        />
        <Acceso
          href={`/materias/${grupo.materia_id}/tests`}
          icon={FileQuestion}
          titulo="Tests de la materia"
          texto="Practica, crea o genera tests con IA"
          clase="border-primary/25 from-primary/15 text-primary hover:border-primary/60"
        />
      </nav>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel titulo="Ranking del grupo" icon={Trophy} tono="text-gold">
            <Leaderboard
              entries={leaderboard}
              userId={userId}
              vacio="Todavía no hay resultados en este grupo."
            />
          </Panel>
        </div>
        <div className="xl:col-span-4">
          <Panel titulo="Miembros" icon={Users} tono="text-primary">
            <ul className="space-y-1.5">
              {miembros.map((m) => {
                const nombre = m.nombre ?? m.email;
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
                  >
                    <Avatar nombre={nombre} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {nombre}
                      </span>
                      <span
                        className={`text-xs ${m.rol === "owner" ? "text-gold" : "text-muted-foreground"}`}
                      >
                        {m.rol === "owner" ? "Dueño" : "Miembro"}
                        {m.user_id === userId && " · tú"}
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
                        <LogOut aria-hidden />
                        Salir del grupo
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

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

function Acceso({
  href,
  icon: Icon,
  titulo,
  texto,
  clase,
}: {
  href: string;
  icon: LucideIcon;
  titulo: string;
  texto: string;
  clase: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border bg-gradient-to-br to-card/40 p-4 transition-all hover:-translate-y-0.5 ${clase}`}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-current/15">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-lg font-semibold text-foreground">
          {titulo}
        </span>
        <span className="block text-sm text-muted-foreground">{texto}</span>
      </span>
      <ArrowRight
        className="size-5 transition-transform group-hover:translate-x-1"
        aria-hidden
      />
    </Link>
  );
}
