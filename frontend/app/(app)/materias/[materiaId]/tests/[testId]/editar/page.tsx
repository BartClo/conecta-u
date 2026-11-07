import { notFound } from "next/navigation";
import { TestEditarClient } from "./test-editar-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Test } from "@/lib/types";

export default async function TestEditarPage({
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

  return <TestEditarClient test={test} userId={me.id} />;
}
