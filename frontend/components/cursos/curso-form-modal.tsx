"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLORES_CURSO, COLOR_SWATCH } from "@/lib/colors";
import { modalVariants } from "@/lib/motion";
import type { Curso } from "@/lib/types";

const schema = z.object({
  nombre: z.string().min(1),
  codigo: z.string().min(1),
  profesor: z.string(),
  color: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface CursoFormModalProps {
  curso?: Curso;
  onSubmit: (data: {
    nombre: string;
    codigo: string;
    profesor: string | null;
    color: string;
  }) => void;
  onClose: () => void;
}

export function CursoFormModal({
  curso,
  onSubmit,
  onClose,
}: CursoFormModalProps) {
  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: curso?.nombre ?? "",
      codigo: curso?.codigo ?? "",
      profesor: curso?.profesor ?? "",
      color: curso?.color ?? COLORES_CURSO[0],
    },
  });
  const color = watch("color");

  function onValid(values: FormValues) {
    onSubmit({ ...values, profesor: values.profesor || null });
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center bg-black/40">
        <motion.form
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onSubmit={handleSubmit(onValid)}
          className="w-80 space-y-3 rounded-xl bg-card p-6 shadow-xl"
        >
          <h2 className="text-lg font-semibold">
            {curso ? "Editar curso" : "Nuevo curso"}
          </h2>

          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" {...register("nombre")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" {...register("codigo")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profesor">Profesor</Label>
            <Input id="profesor" {...register("profesor")} />
          </div>

          <div className="space-y-1">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORES_CURSO.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setValue("color", c)}
                  className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`}
                  style={{ backgroundColor: COLOR_SWATCH[c] }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
