import { ResumenesClient } from "./resumenes-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Resumen } from "@/lib/types";

export default async function ResumenesPage() {
  const resumenes = await apiFetchServer<Resumen[]>("/api/ia/resumenes");
  return <ResumenesClient resumenes={resumenes} />;
}
