"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mensajeDeError } from "@/lib/api-error";
import { staggerContainer } from "@/lib/motion";
import type { Test, TestPayload } from "@/lib/types";
import { PreguntaField } from "./pregunta-field";

const MARCA = "Marca una opción correcta";

const testSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "El título no puede estar vacío")
    .max(150, "El título no puede superar 150 caracteres"),
  descripcion: z.string(),
  preguntas: z
    .array(
      z.object({
        enunciado: z
          .string()
          .trim()
          .min(1, "El enunciado no puede estar vacío"),
        opciones: z
          .array(
            z.object({
              texto: z
                .string()
                .trim()
                .min(1, "La opción no puede estar vacía")
                .max(500, "La opción no puede superar 500 caracteres"),
            }),
          )
          .min(2, "Agrega al menos 2 opciones"),
        // null = nothing marked yet; the radio group guarantees at most one.
        correctaIndex: z
          .number()
          .nullable()
          .refine((v) => v !== null, MARCA),
      }),
    )
    .min(1, "Agrega al menos una pregunta"),
});

// Input type: correctaIndex is null until a radio is marked; the schema output
// (what onValid receives) guarantees a number.
export type TestFormValues = z.input<typeof testSchema>;
export type TestOutput = z.output<typeof testSchema>;

export function toFormValues(test: Test): TestFormValues {
  return {
    titulo: test.titulo,
    descripcion: test.descripcion ?? "",
    preguntas: test.preguntas.map((p) => {
      const idx = p.opciones.findIndex((o) => o.es_correcta);
      return {
        enunciado: p.enunciado,
        opciones: p.opciones.map((o) => ({ texto: o.texto })),
        correctaIndex: idx === -1 ? null : idx,
      };
    }),
  };
}

interface TestEditorProps {
  materiaId: string;
  defaultValues?: TestFormValues;
  submitLabel?: string;
  onSubmit: (payload: TestPayload) => Promise<void>;
}

export function TestEditor({
  materiaId,
  defaultValues,
  submitLabel = "Guardar test",
  onSubmit,
}: TestEditorProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TestFormValues, unknown, TestOutput>({
    resolver: zodResolver(testSchema),
    defaultValues: defaultValues ?? {
      titulo: "",
      descripcion: "",
      preguntas: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "preguntas",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onValid(values: TestOutput) {
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        materia_id: materiaId,
        titulo: values.titulo,
        descripcion: values.descripcion.trim() || null,
        preguntas: values.preguntas.map((p) => ({
          enunciado: p.enunciado,
          opciones: p.opciones.map((o, i) => ({
            texto: o.texto,
            es_correcta: i === p.correctaIndex,
          })),
        })),
      });
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar."));
      setPending(false);
    }
  }

  const preguntasError =
    errors.preguntas?.root?.message ?? errors.preguntas?.message;

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" {...register("titulo")} />
        {errors.titulo && (
          <p className="text-sm text-destructive">{errors.titulo.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="descripcion">Descripción (opcional)</Label>
        <Textarea id="descripcion" {...register("descripcion")} />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        {/* No exit animation on purpose: AnimatePresence keeps the removed item
            mounted with its stale index, so two inputs share one RHF field name
            and the payload gets the stale node's value. */}
        {fields.map((f, qIndex) => (
          <PreguntaField
            key={f.id}
            control={control}
            register={register}
            errors={errors}
            qIndex={qIndex}
            onRemove={() => remove(qIndex)}
          />
        ))}
      </motion.div>
      {preguntasError && (
        <p className="text-sm text-destructive">{preguntasError}</p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            enunciado: "",
            opciones: [{ texto: "" }, { texto: "" }],
            correctaIndex: null,
          })
        }
      >
        Agregar pregunta
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
