import { Graph3D } from "@/components/dashboard/graph-3d";
import { apiFetchServer } from "@/lib/api-server";
import { semestreActivo } from "@/lib/semestre";
import type { Curso, Grupo, Semestre } from "@/lib/types";

interface Me {
  name: string | null;
  email: string;
}

export default async function DashboardPage() {
  const [me, semestres, grupos] = await Promise.all([
    apiFetchServer<Me>("/api/me"),
    apiFetchServer<Semestre[]>("/api/semestres"),
    apiFetchServer<Grupo[]>("/api/grupos"),
  ]);

  const activo = semestreActivo(semestres);
  const cursos = activo
    ? await apiFetchServer<Curso[]>(`/api/cursos?semestre_id=${activo.id}`)
    : [];

  const nombre = me.name ?? me.email;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hola, {nombre}</h1>
      <Graph3D
        cursos={cursos}
        grupos={grupos}
        userInitial={nombre.charAt(0).toUpperCase()}
      />
    </div>
  );
}
