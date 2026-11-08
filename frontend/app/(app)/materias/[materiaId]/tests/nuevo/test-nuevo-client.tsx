"use client";

import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
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
      <PageHeader
        back={{
          href: `/materias/${materiaId}/tests`,
          label: "Tests de la materia",
        }}
        icon={FilePlus2}
        eyebrow="Editor"
        title="Nuevo test"
        description="Escribe las preguntas y marca la opción correcta de cada una."
      />
      <TestEditor
        materiaId={materiaId}
        submitLabel="Crear test"
        onSubmit={handleCreate}
      />
    </div>
  );
}
