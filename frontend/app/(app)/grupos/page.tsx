import { GruposClient } from "./grupos-client";
import { apiFetchServer, porGrupo } from "@/lib/api-server";
import { statsDeGrupos } from "@/lib/grupos";
import type { DesafioOut, Grupo, LeaderboardEntry, Miembro } from "@/lib/types";

export default async function GruposPage() {
  const [grupos, me] = await Promise.all([
    apiFetchServer<Grupo[]>("/api/grupos"),
    apiFetchServer<{ id: string }>("/api/me"),
  ]);
  const [miembros, desafios, tablas] = await Promise.all([
    porGrupo<Miembro[]>(grupos, (id) => `/api/grupos/${id}/miembros`),
    porGrupo<DesafioOut[]>(grupos, (id) => `/api/grupos/${id}/desafios`),
    porGrupo<LeaderboardEntry[]>(
      grupos,
      (id) => `/api/grupos/${id}/leaderboard`,
    ),
  ]);

  return (
    <GruposClient
      initialGrupos={grupos}
      stats={statsDeGrupos(grupos, miembros, desafios, tablas, me.id)}
    />
  );
}
