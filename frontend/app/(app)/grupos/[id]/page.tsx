import { notFound } from "next/navigation";
import { GrupoDetalleClient } from "./grupo-detalle-client";
import { apiFetchServer } from "@/lib/api-server";
import type { GrupoDetalle, LeaderboardEntry, Miembro } from "@/lib/types";

export default async function GrupoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let grupo: GrupoDetalle;
  let miembros: Miembro[];
  let leaderboard: LeaderboardEntry[];
  let me: { id: string };
  try {
    [grupo, miembros, leaderboard, me] = await Promise.all([
      apiFetchServer<GrupoDetalle>(`/api/grupos/${id}`),
      apiFetchServer<Miembro[]>(`/api/grupos/${id}/miembros`),
      apiFetchServer<LeaderboardEntry[]>(`/api/grupos/${id}/leaderboard`),
      apiFetchServer<{ id: string }>("/api/me"),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message.endsWith("404")) notFound();
    throw err;
  }

  return (
    <GrupoDetalleClient
      grupo={grupo}
      miembros={miembros}
      leaderboard={leaderboard}
      userId={me.id}
    />
  );
}
