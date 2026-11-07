import { notFound } from "next/navigation";
import { GrupoDetalleClient } from "./grupo-detalle-client";
import { apiFetchServer } from "@/lib/api-server";
import type { GrupoDetalle, Miembro } from "@/lib/types";

export default async function GrupoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let grupo: GrupoDetalle;
  let miembros: Miembro[];
  let me: { id: string };
  try {
    [grupo, miembros, me] = await Promise.all([
      apiFetchServer<GrupoDetalle>(`/api/grupos/${id}`),
      apiFetchServer<Miembro[]>(`/api/grupos/${id}/miembros`),
      apiFetchServer<{ id: string }>("/api/me"),
    ]);
  } catch {
    notFound();
  }

  return (
    <GrupoDetalleClient grupo={grupo} miembros={miembros} userId={me.id} />
  );
}
