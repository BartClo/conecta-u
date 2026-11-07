import { GruposClient } from "./grupos-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Grupo } from "@/lib/types";

export default async function GruposPage() {
  const grupos = await apiFetchServer<Grupo[]>("/api/grupos");

  return <GruposClient initialGrupos={grupos} />;
}
