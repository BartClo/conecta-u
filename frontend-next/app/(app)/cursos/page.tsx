import { CursosClient } from "./cursos-client";
import { apiFetchServer } from "@/lib/api-server";
import { semestreActivo } from "@/lib/semestre";
import type { Curso, Semestre } from "@/lib/types";

export default async function CursosPage() {
  const semestres = await apiFetchServer<Semestre[]>("/api/semestres");
  const activo = semestreActivo(semestres);
  const cursos = activo
    ? await apiFetchServer<Curso[]>(`/api/cursos?semestre_id=${activo.id}`)
    : [];

  return <CursosClient initialSemestres={semestres} initialCursos={cursos} />;
}
