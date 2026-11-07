import { notFound } from "next/navigation";
import { CursoDetalleClient } from "./curso-detalle-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Curso } from "@/lib/types";

export default async function CursoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let curso: Curso;
  try {
    curso = await apiFetchServer<Curso>(`/api/cursos/${id}`);
  } catch {
    notFound();
  }

  return <CursoDetalleClient curso={curso} />;
}
