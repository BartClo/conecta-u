"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MateriaCombobox } from "@/components/grupos/materia-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modalVariants } from "@/lib/motion";
import type { Grupo, Materia } from "@/lib/types";

const schema = z.object({
  nombre: z.string().trim().min(1, "Escribe un nombre.").max(120),
  materia_id: z.string().min(1, "Selecciona una materia."),
});

type FormValues = z.infer<typeof schema>;

interface GrupoFormModalProps {
  // When present the modal edits only the name (the materia is not editable).
  grupo?: Grupo;
  onSubmit: (data: FormValues) => Promise<void>;
  onClose: () => void;
}

export function GrupoFormModal({
  grupo,
  onSubmit,
  onClose,
}: GrupoFormModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: grupo?.nombre ?? "",
      materia_id: grupo?.materia_id ?? "",
    },
  });
  const [materia, setMateria] = useState<Materia | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onValid(values: FormValues) {
    setPending(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setPending(false);
    }
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
            {grupo ? "Editar grupo" : "Nuevo grupo"}
          </h2>

          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" {...register("nombre")} />
            {errors.nombre && (
              <p className="text-sm text-destructive">
                {errors.nombre.message}
              </p>
            )}
          </div>

          {!grupo && (
            <div className="space-y-1">
              <Label>Materia</Label>
              <MateriaCombobox
                value={materia}
                onChange={(m) => {
                  setMateria(m);
                  setError(null);
                  clearErrors("materia_id");
                  setValue("materia_id", m.id, { shouldValidate: true });
                }}
                onError={setError}
              />
              {errors.materia_id && (
                <p className="text-sm text-destructive">
                  {errors.materia_id.message}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
