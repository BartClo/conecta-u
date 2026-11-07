"use client";

import { motion } from "framer-motion";
import {
  useController,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { TestFormValues, TestOutput } from "./test-editor";

const MIN_OPCIONES = 2;

interface PreguntaFieldProps {
  control: Control<TestFormValues, unknown, TestOutput>;
  register: UseFormRegister<TestFormValues>;
  errors: FieldErrors<TestFormValues>;
  qIndex: number;
  onRemove: () => void;
}

export function PreguntaField({
  control,
  register,
  errors,
  qIndex,
  onRemove,
}: PreguntaFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `preguntas.${qIndex}.opciones`,
  });
  const { field: correcta } = useController({
    control,
    name: `preguntas.${qIndex}.correctaIndex`,
  });
  const error = errors.preguntas?.[qIndex];
  const opcionesError =
    error?.opciones?.root?.message ?? error?.opciones?.message;

  function handleRemoveOpcion(oIndex: number) {
    remove(oIndex);
    const actual = correcta.value;
    if (actual === oIndex) correcta.onChange(null);
    else if (actual !== null && actual > oIndex) correcta.onChange(actual - 1);
  }

  return (
    <motion.div
      variants={staggerItem}
      initial="initial"
      animate="animate"
      className="space-y-3 rounded-xl border p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pregunta {qIndex + 1}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Quitar pregunta
        </Button>
      </div>

      <div className="space-y-1">
        <Textarea
          aria-label={`Enunciado de la pregunta ${qIndex + 1}`}
          {...register(`preguntas.${qIndex}.enunciado`)}
        />
        {error?.enunciado && (
          <p className="text-sm text-destructive">{error.enunciado.message}</p>
        )}
      </div>

      <motion.ul
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-2"
      >
        {fields.map((f, oIndex) => (
          <motion.li key={f.id} variants={staggerItem} className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`preguntas.${qIndex}.correctaIndex`}
                aria-label={`Marcar la opción ${oIndex + 1} de la pregunta ${qIndex + 1} como correcta`}
                checked={correcta.value === oIndex}
                onChange={() => correcta.onChange(oIndex)}
              />
              <Input
                aria-label={`Opción ${oIndex + 1} de la pregunta ${qIndex + 1}`}
                {...register(`preguntas.${qIndex}.opciones.${oIndex}.texto`)}
              />
              {fields.length > MIN_OPCIONES && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Quitar la opción ${oIndex + 1} de la pregunta ${qIndex + 1}`}
                  onClick={() => handleRemoveOpcion(oIndex)}
                >
                  Quitar
                </Button>
              )}
            </div>
            {error?.opciones?.[oIndex]?.texto && (
              <p className="text-sm text-destructive">
                {error.opciones[oIndex].texto.message}
              </p>
            )}
          </motion.li>
        ))}
      </motion.ul>

      {opcionesError && (
        <p className="text-sm text-destructive">{opcionesError}</p>
      )}
      {error?.correctaIndex && (
        <p className="text-sm text-destructive">
          {error.correctaIndex.message}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ texto: "" })}
      >
        Agregar opción
      </Button>
    </motion.div>
  );
}
