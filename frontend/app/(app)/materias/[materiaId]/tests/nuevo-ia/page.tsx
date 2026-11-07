import { TestIaClient } from "./test-ia-client";

export default async function TestNuevoIaPage({
  params,
}: {
  params: Promise<{ materiaId: string }>;
}) {
  const { materiaId } = await params;
  return <TestIaClient materiaId={materiaId} />;
}
