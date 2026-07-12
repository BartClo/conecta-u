import type { Semestre } from "./types";

export function semestreActivo(semestres: Semestre[]): Semestre | null {
  if (semestres.length === 0) return null;

  const hoy = new Date().toISOString().slice(0, 10);
  const enCurso = semestres.find((s) => s.fecha_inicio <= hoy && hoy <= s.fecha_fin);
  if (enCurso) return enCurso;

  return [...semestres].sort((a, b) => b.fecha_fin.localeCompare(a.fecha_fin))[0];
}
