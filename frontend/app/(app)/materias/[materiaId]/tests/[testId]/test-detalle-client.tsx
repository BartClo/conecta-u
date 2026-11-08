"use client";

import {
  ArrowLeft,
  Check,
  ListChecks,
  Pencil,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { mensajeDeError, TEST_EN_USO } from "@/lib/api-error";
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
      setError(mensajeDeError(err, "Algo salió mal.", TEST_EN_USO));
    }
  }

  const n = test.preguntas.length;
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/20 via-card/80 to-xp/10 p-6">
        <span className="bg-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="relative space-y-3">
          <Link
            href={base}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver a los tests
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h1 className="font-heading text-3xl font-bold tracking-tight break-words">
                {test.titulo}
              </h1>
              {test.descripcion && (
                <p className="text-muted-foreground">{test.descripcion}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1">
                  <ListChecks className="size-3.5 text-primary" aria-hidden />
                  {n} {n === 1 ? "pregunta" : "preguntas"}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1">
                  <UserRound className="size-3.5 text-cyan" aria-hidden />
                  <span>{esAutor ? "Tú" : "Otro autor"}</span>
                </span>
                {test.origen === "ia" && (
                  <span className="flex items-center gap-1.5 rounded-full bg-xp/15 px-2.5 py-1 text-xp">
                    <Sparkles className="size-3.5" aria-hidden />
                    Generado con IA
                  </span>
                )}
              </div>
            </div>
            {esAutor && (
              <div className="flex gap-2">
                <Link
                  href={`${base}/${test.id}/editar`}
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  <Pencil aria-hidden />
                  Editar
                </Link>
                <Button variant="destructive" size="lg" onClick={handleDelete}>
                  <Trash2 aria-hidden />
                  Borrar
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <ol className="grid gap-4 lg:grid-cols-2">
        {test.preguntas.map((p) => (
          <li
            key={p.id}
            className="space-y-3 rounded-2xl border bg-card/70 p-5"
          >
            <h2 className="flex gap-3 font-heading font-semibold">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-sm text-primary">
                {p.orden + 1}
              </span>
              <span className="pt-1">{p.enunciado}</span>
            </h2>
            <ul className="space-y-1.5">
              {p.opciones.map((o, i) => (
                <li
                  key={o.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                    o.es_correcta
                      ? "border-xp/40 bg-xp/10 text-foreground"
                      : "border-transparent bg-background/40"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold ${o.es_correcta ? "bg-xp text-background" : "bg-muted text-muted-foreground"}`}
                  >
                    {o.es_correcta ? (
                      <Check className="size-3.5" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span className={o.es_correcta ? "font-medium" : undefined}>
                    {o.texto}
                    {o.es_correcta && " ✓ Correcta"}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
