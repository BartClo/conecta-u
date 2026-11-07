import { Graph3D } from "@/components/dashboard/graph-3d";
import { apiFetchServer } from "@/lib/api-server";
import { semestreActivo } from "@/lib/semestre";
import type { Curso, Semestre } from "@/lib/types";

interface Me {
  name: string | null;
  email: string;
}

export default async function DashboardPage() {
  const [me, semestres] = await Promise.all([
    apiFetchServer<Me>("/api/me"),
    apiFetchServer<Semestre[]>("/api/semestres"),
  ]);

  const activo = semestreActivo(semestres);
  const cursos = activo
    ? await apiFetchServer<Curso[]>(`/api/cursos?semestre_id=${activo.id}`)
    : [];

  const nombre = me.name ?? me.email;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hola, {nombre}</h1>
      <Graph3D cursos={cursos} userInitial={nombre.charAt(0).toUpperCase()} />
    </div>
  );
}
