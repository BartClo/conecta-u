"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import type { Test } from "@/lib/types";

interface TestDetalleClientProps {
  test: Test;
  userId: string;
}

export function TestDetalleClient({ test, userId }: TestDetalleClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const esAutor = test.autor_id === userId;
  const base = `/materias/${test.materia_id}/tests`;

  // UI only hides the actions; the backend is the authority (403).
  async function handleDelete() {
    if (!confirm(`¿Borrar el test "${test.titulo}"?`)) return;
    setError(null);
    try {
      await apiFetchClient(`/api/tests/${test.id}`, { method: "DELETE" });
      router.push(base);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <h1 className="text-xl font-semibold">{test.titulo}</h1>
        {test.descripcion && (
          <p className="text-muted-foreground">{test.descripcion}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {esAutor ? "Tú" : "Otro autor"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={base} className={buttonVariants({ variant: "outline" })}>
          Volver a los tests
        </Link>
        {esAutor && (
          <>
            <Link
              href={`${base}/${test.id}/editar`}
              className={buttonVariants({ variant: "outline" })}
            >
              Editar
            </Link>
            <Button variant="destructive" onClick={handleDelete}>
              Borrar
            </Button>
          </>
        )}
      </div>

      <ol className="space-y-4">
        {test.preguntas.map((p) => (
          <li key={p.id} className="space-y-2 rounded-xl border p-4">
            <h2 className="font-semibold">
              {p.orden + 1}. {p.enunciado}
            </h2>
            <ul className="space-y-1">
              {p.opciones.map((o) => (
                <li
                  key={o.id}
                  className={
                    o.es_correcta
                      ? "rounded-lg bg-green-100 px-2 py-1 text-green-900 dark:bg-green-900/30 dark:text-green-100"
                      : "px-2 py-1"
                  }
                >
                  {o.texto}
                  {o.es_correcta && " ✓ Correcta"}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
