import { Lock } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card/40 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="size-7" aria-hidden />
        </span>
        <h1 className="font-heading text-2xl font-bold">
          {rendir.status === 409
            ? "Este desafío no está disponible"
            : "Desafío no encontrado"}
        </h1>
        <Link
          href={`/grupos/${id}/desafios`}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Volver a desafíos
        </Link>
      </div>
      {rendir.status === 409 && (await seccionRanking(desafioId, false))}
    </div>
  );
}
