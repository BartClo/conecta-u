import Link from "next/link";
import { RendirClient } from "./rendir-client";
import { ResultadoClient } from "./resultado-client";
import { DesafioRanking } from "@/components/desafios/desafio-ranking";
import { apiFetchServer, apiFetchServerSafe } from "@/lib/api-server";
import type {
  DesafioDetalle,
  IntentoOut,
  RankingDesafioEntry,
  TestParaRendir,
} from "@/lib/types";

// El ranking solo se pide si ya rindio o el desafio esta cerrado (si no, el API da 403).
async function seccionRanking(desafioId: string, rindio: boolean) {
  const [detalle, me] = await Promise.all([
    apiFetchServerSafe<DesafioDetalle>(`/api/desafios/${desafioId}`),
    apiFetchServer<{ id: string }>("/api/me"),
  ]);
  if (!detalle.data) return null;
  const ranking =
    rindio || detalle.data.estado === "cerrado"
      ? await apiFetchServer<RankingDesafioEntry[]>(
          `/api/desafios/${desafioId}/ranking`,
        )
      : null;
  return (
    <DesafioRanking desafio={detalle.data} ranking={ranking} userId={me.id} />
  );
}

export default async function DesafioPage({
  params,
}: {
  params: Promise<{ id: string; desafioId: string }>;
}) {
  const { id, desafioId } = await params;

  const mio = await apiFetchServerSafe<IntentoOut>(
    `/api/desafios/${desafioId}/intentos/me`,
  );
  if (mio.status !== 200 && mio.status !== 404) {
    throw new Error(`API request failed: ${mio.status}`);
  }
  if (mio.data) {
    return (
      <ResultadoClient grupoId={id} miIntento={mio.data}>
        {await seccionRanking(desafioId, true)}
      </ResultadoClient>
    );
  }

  const rendir = await apiFetchServerSafe<TestParaRendir>(
    `/api/desafios/${desafioId}/rendir`,
  );
  if (![200, 404, 409].includes(rendir.status)) {
    throw new Error(`API request failed: ${rendir.status}`);
  }
  if (rendir.data) {
    return (
      <div className="space-y-6">
        <RendirClient grupoId={id} desafioId={desafioId} test={rendir.data} />
        {await seccionRanking(desafioId, false)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        {rendir.status === 409
          ? "Este desafío no está disponible"
          : "Desafío no encontrado"}
      </h1>
      {rendir.status === 409 && (await seccionRanking(desafioId, false))}
      <Link href={`/grupos/${id}/desafios`} className="underline">
        Volver a desafíos
      </Link>
    </div>
  );
}
