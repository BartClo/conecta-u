import { TestsClient } from "./tests-client";
import { apiFetchServer } from "@/lib/api-server";
import type { Test } from "@/lib/types";

export default async function TestsPage({
  params,
}: {
  params: Promise<{ materiaId: string }>;
}) {
  const { materiaId } = await params;
  // An unknown materia yields an empty list, which renders the empty state.
  const [tests, me] = await Promise.all([
    apiFetchServer<Test[]>(
      `/api/tests?materia_id=${encodeURIComponent(materiaId)}`,
    ),
    apiFetchServer<{ id: string }>("/api/me"),
  ]);

  return <TestsClient materiaId={materiaId} tests={tests} userId={me.id} />;
}
