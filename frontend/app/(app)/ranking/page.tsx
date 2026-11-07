import { RankingClient } from "./ranking-client";
import { apiFetchServer } from "@/lib/api-server";
import type { LeaderboardEntry, Materia } from "@/lib/types";

export default async function RankingPage() {
  const materias = await apiFetchServer<Materia[]>("/api/materias");
  const inicial = materias[0]
    ? await apiFetchServer<LeaderboardEntry[]>(
        `/api/materias/${materias[0].id}/ranking`,
      )
    : [];

  return <RankingClient materias={materias} initialEntries={inicial} />;
}
