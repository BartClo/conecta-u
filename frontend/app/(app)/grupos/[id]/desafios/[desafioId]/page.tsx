import Link from "next/link";
import { RendirClient } from "./rendir-client";
import { ResultadoClient } from "./resultado-client";
import { apiFetchServer, apiFetchServerSafe } from "@/lib/api-server";
import type {
  IntentoOut,
  ResultadoDesafioOut,
  TestParaRendir,
} from "@/lib/types";

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
    const resultados = await apiFetchServer<ResultadoDesafioOut[]>(
      `/api/desafios/${desafioId}/resultados`,
    );
    return (
      <ResultadoClient
        grupoId={id}
        miIntento={mio.data}
        resultados={resultados}
      />
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
      <RendirClient grupoId={id} desafioId={desafioId} test={rendir.data} />
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">
        {rendir.status === 409
          ? "Este desafío no está disponible"
          : "Desafío no encontrado"}
      </h1>
      <Link href={`/grupos/${id}/desafios`} className="underline">
        Volver a desafíos
      </Link>
    </div>
  );
}
