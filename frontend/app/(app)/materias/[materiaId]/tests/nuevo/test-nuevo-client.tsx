"use client";

import { useRouter } from "next/navigation";
import { TestEditor } from "@/components/tests/test-editor";
import { apiFetchClient } from "@/lib/api-client";
import type { Test, TestPayload } from "@/lib/types";

export function TestNuevoClient({ materiaId }: { materiaId: string }) {
  const router = useRouter();

  async function handleCreate(payload: TestPayload) {
    const nuevo = await apiFetchClient<Test>("/api/tests", {
      method: "POST",
      body: payload,
    });
    router.push(`/materias/${materiaId}/tests/${nuevo.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo test</h1>
      <TestEditor
        materiaId={materiaId}
        submitLabel="Crear test"
        onSubmit={handleCreate}
      />
    </div>
  );
}
