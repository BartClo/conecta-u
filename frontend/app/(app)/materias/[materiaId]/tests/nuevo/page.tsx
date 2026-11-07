import { TestNuevoClient } from "./test-nuevo-client";

export default async function TestNuevoPage({
  params,
}: {
  params: Promise<{ materiaId: string }>;
}) {
  const { materiaId } = await params;

  return <TestNuevoClient materiaId={materiaId} />;
}
