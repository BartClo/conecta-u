"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TestEditor, toFormValues } from "@/components/tests/test-editor";
import { apiFetchClient } from "@/lib/api-client";
import type { Test, TestPayload } from "@/lib/types";

interface TestEditarClientProps {
  test: Test;
  userId: string;
}

export function TestEditarClient({ test, userId }: TestEditarClientProps) {
  const router = useRouter();
  const base = `/materias/${test.materia_id}/tests`;

  // Non-authors never receive es_correcta, so the form could not be filled in.
  if (test.autor_id !== userId) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">
          No tienes permiso para editar este test
        </h1>
        <Link href={`${base}/${test.id}`} className="underline">
          Volver al test
        </Link>
      </div>
    );
  }

  async function handleUpdate(payload: TestPayload) {
    try {
      await apiFetchClient<Test>(`/api/tests/${test.id}`, {
        method: "PUT",
        body: payload,
      });
    } catch (err) {
      if (err instanceof Error && err.message.endsWith("403")) {
        throw new Error("No tienes permiso para editar este test");
      }
      throw err;
    }
    router.push(`${base}/${test.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Editar test</h1>
      <TestEditor
        materiaId={test.materia_id}
        defaultValues={toFormValues(test)}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
