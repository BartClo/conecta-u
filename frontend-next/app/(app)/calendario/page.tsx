import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarioClient } from "./calendario-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Curso, Ocurrencia } from "@/lib/types";

export default async function CalendarioPage() {
  const hoy = new Date();
  const inicioGrilla = startOfWeek(startOfMonth(hoy), { weekStartsOn: 1 });
  const finGrilla = endOfWeek(endOfMonth(hoy), { weekStartsOn: 1 });

  const [ocurrencias, cursos] = await Promise.all([
    apiFetchServer<Ocurrencia[]>(
      `/api/eventos?desde=${format(inicioGrilla, "yyyy-MM-dd")}&hasta=${format(finGrilla, "yyyy-MM-dd")}`,
    ),
    apiFetchServer<Curso[]>("/api/cursos"),
  ]);

  return (
    <CalendarioClient
      initialOcurrencias={ocurrencias}
      initialMonth={hoy.toISOString()}
      cursos={cursos}
    />
  );
}
