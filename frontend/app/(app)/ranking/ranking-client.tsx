"use client";

import { useRef, useState } from "react";
import { Leaderboard } from "@/components/ranking/leaderboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetchClient } from "@/lib/api-client";
import type { LeaderboardEntry, Materia } from "@/lib/types";

interface RankingClientProps {
  materias: Materia[];
  initialEntries: LeaderboardEntry[];
}

export function RankingClient({
  materias,
  initialEntries,
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

  if (materias.length === 0) {
    return <p className="text-muted-foreground">Todavía no hay materias.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Ranking</h1>
        <select
          aria-label="Materia"
          value={materiaId}
          onChange={(e) => cargar(e.target.value)}
          className="rounded-md border bg-background px-2 py-1"
        >
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

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
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : (
        <Leaderboard
          entries={entries}
          vacio="Todavía no hay resultados para esta materia."
        />
      )}
    </div>
  );
}
