import { notFound } from "next/navigation";
import { ResumenDetalleClient } from "./resumen-detalle-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Resumen } from "@/lib/types";

export default async function ResumenDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let resumen: Resumen;
  try {
    resumen = await apiFetchServer<Resumen>(`/api/ia/resumenes/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.endsWith("404")) notFound();
    throw err;
  }
  return <ResumenDetalleClient resumen={resumen} />;
}
