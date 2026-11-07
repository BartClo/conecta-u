import { notFound } from "next/navigation";
import { TestDetalleClient } from "./test-detalle-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Test } from "@/lib/types";

export default async function TestDetallePage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  let test: Test;
  let me: { id: string };
  try {
    [test, me] = await Promise.all([
      apiFetchServer<Test>(`/api/tests/${testId}`),
      apiFetchServer<{ id: string }>("/api/me"),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message.endsWith("404")) notFound();
    throw err;
  }

  return <TestDetalleClient test={test} userId={me.id} />;
}
