"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
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
      <div className="space-y-2">
        <p>Este desafío ya no acepta intentos</p>
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
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{test.titulo}</h1>
        <span className="font-mono" aria-label="Tiempo transcurrido">
          {formatoTiempo(elapsed)}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Pregunta {actual + 1} de {total}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(((actual + 1) / total) * 100)}
          className="h-2 overflow-hidden rounded bg-muted"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((actual + 1) / total) * 100}%` }}
          />
        </div>
        <div className="flex gap-1 pt-1">
          {test.preguntas.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Ir a la pregunta ${i + 1}`}
              data-respondida={p.id in respuestas}
              onClick={() => ir(i)}
              className={`size-3 rounded-full border border-primary ${
                p.id in respuestas ? "bg-primary" : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direccion} initial={false}>
        <motion.fieldset
          key={pregunta.id}
          custom={direccion}
          variants={questionSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-2"
        >
          <legend className="mb-2 font-medium">{pregunta.enunciado}</legend>
          {pregunta.opciones.map((o) => {
            const elegida = respuestas[pregunta.id] === o.id;
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                  elegida ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name={pregunta.id}
                  checked={elegida}
                  onChange={() =>
                    setRespuestas((prev) => ({ ...prev, [pregunta.id]: o.id }))
                  }
                />
                {o.texto}
              </label>
            );
          })}
        </motion.fieldset>
      </AnimatePresence>

      {faltan > 0 && (
        <p className="text-sm text-muted-foreground">
          {faltan === 1
            ? "Falta 1 pregunta por responder."
            : `Faltan ${faltan} preguntas por responder.`}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={actual === 0}
          onClick={() => ir(actual - 1)}
        >
          Anterior
        </Button>
        {esUltima ? (
          <Button
            disabled={faltan > 0 || isSubmitting}
            onClick={handleFinalizar}
          >
            {isSubmitting ? "Enviando…" : error ? "Reintentar" : "Finalizar"}
          </Button>
        ) : (
          <Button onClick={() => ir(actual + 1)}>Siguiente</Button>
        )}
      </div>
    </div>
  );
}
