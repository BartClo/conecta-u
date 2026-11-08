"use client";

import { BookOpen, Crown, Medal, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Leaderboard } from "@/components/ranking/leaderboard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetchClient } from "@/lib/api-client";
import type { LeaderboardEntry, Materia } from "@/lib/types";

interface RankingClientProps {
  materias: Materia[];
  initialEntries: LeaderboardEntry[];
  userId?: string;
}

export function RankingClient({
  materias,
  initialEntries,
  userId,
}: RankingClientProps) {
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? "");
  const [entries, setEntries] = useState(initialEntries);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actual = useRef(materiaId);

  async function cargar(id: string) {
    actual.current = id;
    setMateriaId(id);
    setEntries([]);
    setCargando(true);
    setError(null);
    try {
      const datos = await apiFetchClient<LeaderboardEntry[]>(
        `/api/materias/${id}/ranking`,
      );
      if (actual.current === id) setEntries(datos);
    } catch (err) {
      if (actual.current === id)
        setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      if (actual.current === id) setCargando(false);
    }
  }

  const header = (select?: React.ReactNode) => (
    <PageHeader
      icon={Trophy}
      tone="text-gold"
      eyebrow="Salón de la fama"
      title="Ranking"
      description="Los mejores de cada materia, sumando todos sus grupos."
      actions={select}
    />
  );

  if (materias.length === 0) {
    return (
      <div className="space-y-6">
        {header()}
        <EmptyState
          icon={Trophy}
          tono="text-gold"
          titulo="Crea un grupo para empezar a competir"
          texto="Todavía no hay materias."
          action={
            <Link href="/grupos" className={buttonVariants({ size: "lg" })}>
              Ir a grupos
            </Link>
          }
        />
      </div>
    );
  }

  const lider = entries[0];
  const ganados = entries.reduce((t, e) => t + e.desafios_ganados, 0);
  const yo = entries.find((e) => e.user_id === userId);

  return (
    <div className="space-y-6">
      {header(
        <label className="flex items-center gap-2 rounded-xl border bg-card/70 px-3 py-1.5 text-sm">
          <BookOpen className="size-4 text-gold" aria-hidden />
          <select
            aria-label="Materia"
            value={materiaId}
            onChange={(e) => cargar(e.target.value)}
            className="cursor-pointer bg-transparent py-1 font-medium outline-none"
          >
            {materias.map((m) => (
              <option key={m.id} value={m.id} className="bg-popover">
                {m.nombre}
              </option>
            ))}
          </select>
        </label>,
      )}

      {error && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => cargar(materiaId)}>
            Reintentar
          </Button>
        </div>
      )}

      {cargando ? (
        <div data-testid="ranking-skeleton" className="space-y-2">
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          {entries.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-3">
              <StatCard
                icon={Crown}
                tono="text-gold"
                borde="from-gold/20"
                valor={lider.suma_puntajes}
                etiqueta="Puntos del líder"
                pie={`${entries.length} ${entries.length === 1 ? "competidor" : "competidores"}`}
              />
              <StatCard
                icon={Swords}
                tono="text-cyan"
                borde="from-cyan/20"
                valor={ganados}
                etiqueta="Desafíos ganados"
                pie="entre todos los participantes"
              />
              <StatCard
                icon={Medal}
                tono="text-primary"
                borde="from-primary/25"
                valor={yo ? `#${yo.posicion}` : "—"}
                etiqueta="Tu posición"
                pie={
                  yo
                    ? `${yo.suma_puntajes} pts acumulados`
                    : "rinde un desafío para entrar"
                }
              />
            </section>
          )}
          <section className="relative overflow-hidden rounded-3xl border bg-card/60 px-4 pb-6 pt-10 sm:px-8">
            <span
              className="absolute left-1/2 top-0 h-56 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-gold/15 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <Leaderboard
                entries={entries}
                userId={userId}
                vacio="Todavía no hay resultados para esta materia."
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
