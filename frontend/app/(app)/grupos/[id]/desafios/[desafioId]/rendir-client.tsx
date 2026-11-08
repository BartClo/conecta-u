"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Flag, Lock, Swords, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { ResultadoClient } from "./resultado-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { mensajeDeError, statusDeError } from "@/lib/api-error";
import { formatoTiempo } from "@/lib/desafios";
import { questionSlide } from "@/lib/motion";
import type {
  IntentoOut,
  ResultadoDesafioOut,
  TestParaRendir,
} from "@/lib/types";

interface RendirClientProps {
  grupoId: string;
  desafioId: string;
  test: TestParaRendir;
}

interface Final {
  intento: IntentoOut;
  resultados: ResultadoDesafioOut[];
  recienRendido: boolean;
}

export function RendirClient({ grupoId, desafioId, test }: RendirClientProps) {
  const total = test.preguntas.length;
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [actual, setActual] = useState(0);
  const [direccion, setDireccion] = useState<1 | -1>(1);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [final, setFinal] = useState<Final | null>(null);

  const terminado = final !== null || cerrado;
  useEffect(() => {
    if (terminado) return;
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [startedAt, terminado]);

  if (final) {
    return (
      <ResultadoClient
        grupoId={grupoId}
        miIntento={final.intento}
        resultados={final.resultados}
        recienRendido={final.recienRendido}
      />
    );
  }

  if (cerrado) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border bg-card/70 p-8 text-center">
        <Lock className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-heading text-lg font-semibold">
          Este desafío ya no acepta intentos
        </p>
        <Link
          href={`/grupos/${grupoId}/desafios`}
          className={buttonVariants({ variant: "outline" })}
        >
          Volver a desafíos
        </Link>
      </div>
    );
  }

  const pregunta = test.preguntas[actual];
  const faltan = total - Object.keys(respuestas).length;
  const esUltima = actual === total - 1;

  function ir(indice: number) {
    setDireccion(indice >= actual ? 1 : -1);
    setActual(indice);
  }

  const cargarResultados = (): Promise<ResultadoDesafioOut[]> =>
    apiFetchClient<ResultadoDesafioOut[]>(
      `/api/desafios/${desafioId}/resultados`,
    );

  async function handleFinalizar() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const intento = await apiFetchClient<IntentoOut>(
        `/api/desafios/${desafioId}/intentos`,
        {
          method: "POST",
          body: {
            segundos: Math.round((Date.now() - startedAt) / 1000),
            respuestas: Object.entries(respuestas).map(
              ([pregunta_id, opcion_id]) => ({ pregunta_id, opcion_id }),
            ),
          },
        },
      );
      const resultados = await cargarResultados().catch(() => []);
      setFinal({ intento, resultados, recienRendido: true });
    } catch (err) {
      if (statusDeError(err) === 409) {
        // "ya_rindio" and "desafio_no_disponible" both surface as 409 here:
        // ask the server whether we already have an attempt.
        try {
          const intento = await apiFetchClient<IntentoOut>(
            `/api/desafios/${desafioId}/intentos/me`,
          );
          const resultados = await cargarResultados().catch(() => []);
          setFinal({ intento, resultados, recienRendido: false });
        } catch (err2) {
          if (statusDeError(err2) === 404) setCerrado(true);
          else setError(mensajeDeError(err2, "No se pudo enviar el intento."));
        }
      } else {
        setError(mensajeDeError(err, "No se pudo enviar el intento."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-cyan/15 via-card/80 to-primary/15 p-5">
        <span className="bg-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan">
              <Swords className="size-3.5" aria-hidden />
              Desafío en curso
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {test.titulo}
            </h1>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-background/70 px-4 py-2 backdrop-blur">
            <Timer
              className="size-6 text-gold motion-safe:animate-pulse"
              aria-hidden
            />
            <span
              className="font-mono text-3xl font-bold text-gold tabular"
              aria-label="Tiempo transcurrido"
            >
              {formatoTiempo(elapsed)}
            </span>
          </div>
        </div>

        <div className="relative mt-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium">
              Pregunta {actual + 1} de {total}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {test.preguntas.map((p, i) => {
                const hecha = p.id in respuestas;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={`Ir a la pregunta ${i + 1}`}
                    data-respondida={hecha}
                    onClick={() => ir(i)}
                    className={`grid size-7 cursor-pointer place-items-center rounded-lg text-xs font-bold transition-all ${
                      hecha
                        ? "bg-primary text-primary-foreground"
                        : "border bg-background/60 text-muted-foreground hover:border-primary/60"
                    } ${i === actual ? "ring-2 ring-cyan ring-offset-2 ring-offset-background" : ""}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(((actual + 1) / total) * 100)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan transition-all duration-500"
              style={{ width: `${((actual + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait" custom={direccion} initial={false}>
        <motion.fieldset
          key={pregunta.id}
          custom={direccion}
          variants={questionSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="rounded-3xl border bg-card/70 p-5 sm:p-6"
        >
          <legend className="float-left mb-5 w-full font-heading text-xl font-semibold leading-snug sm:text-2xl">
            {pregunta.enunciado}
          </legend>
          <div className="clear-both grid gap-3 sm:grid-cols-2">
            {pregunta.opciones.map((o, i) => {
              const elegida = respuestas[pregunta.id] === o.id;
              return (
                <label
                  key={o.id}
                  className={`group flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-all ${
                    elegida
                      ? "border-primary bg-primary/15 shadow-[0_0_30px_-10px_var(--primary)]"
                      : "border-border bg-background/40 hover:-translate-y-0.5 hover:border-primary/50"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid size-9 shrink-0 place-items-center rounded-xl font-heading font-bold transition-colors ${
                      elegida
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 font-medium">{o.texto}</span>
                  <input
                    type="radio"
                    name={pregunta.id}
                    aria-label={o.texto}
                    checked={elegida}
                    onChange={() =>
                      setRespuestas((prev) => ({
                        ...prev,
                        [pregunta.id]: o.id,
                      }))
                    }
                    className="size-4 accent-[var(--primary)]"
                  />
                </label>
              );
            })}
          </div>
        </motion.fieldset>
      </AnimatePresence>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          disabled={actual === 0}
          onClick={() => ir(actual - 1)}
        >
          <ArrowLeft aria-hidden />
          Anterior
        </Button>
        {faltan > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {faltan === 1
              ? "Falta 1 pregunta por responder."
              : `Faltan ${faltan} preguntas por responder.`}
          </p>
        )}
        {esUltima ? (
          <Button
            size="lg"
            disabled={faltan > 0 || isSubmitting}
            onClick={handleFinalizar}
            className="bg-xp text-background hover:bg-xp/85"
          >
            <Flag aria-hidden />
            {isSubmitting ? "Enviando…" : error ? "Reintentar" : "Finalizar"}
          </Button>
        ) : (
          <Button size="lg" onClick={() => ir(actual + 1)}>
            Siguiente
            <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
