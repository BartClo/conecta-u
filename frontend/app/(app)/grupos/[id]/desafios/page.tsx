import { notFound } from "next/navigation";
import { DesafiosClient } from "./desafios-client";
import { apiFetchServer } from "@/lib/api-server";
import type { DesafioOut, GrupoDetalle, Test } from "@/lib/types";

export default async function DesafiosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let desafios: DesafioOut[];
  let tests: Test[];
  let grupo: GrupoDetalle;
  try {
    grupo = await apiFetchServer<GrupoDetalle>(`/api/grupos/${id}`);
    [desafios, tests] = await Promise.all([
      apiFetchServer<DesafioOut[]>(`/api/grupos/${id}/desafios`),
      apiFetchServer<Test[]>(`/api/tests?materia_id=${grupo.materia_id}`),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message.endsWith("404")) notFound();
    throw err;
  }

  return (
    <DesafiosClient
      grupoId={id}
      grupoNombre={grupo.nombre}
      initialDesafios={desafios}
      testsDisponibles={tests.map((t) => ({ id: t.id, titulo: t.titulo }))}
    />
  );
}
