import { Graph3D } from "@/components/dashboard/graph-3d";
import { apiFetchServer } from "@/lib/api-server";
import type { Curso, Semestre } from "@/lib/types";

interface Me {
  name: string | null;
  email: string;
}

function semestreActivo(semestres: Semestre[]): Semestre | null {
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    semestres.find((s) => s.fecha_inicio <= hoy && hoy <= s.fecha_fin) ??
    semestres.sort((a, b) => b.fecha_fin.localeCompare(a.fecha_fin))[0] ??
    null
  );
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
