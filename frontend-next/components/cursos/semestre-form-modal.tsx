"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modalVariants } from "@/lib/motion";

const schema = z.object({
  nombre: z.string().min(1),
  fecha_inicio: z.string().min(1),
  fecha_fin: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

interface SemestreFormModalProps {
  onSubmit: (data: FormValues) => void;
  onClose: () => void;
}

export function SemestreFormModal({
  onSubmit,
  onClose,
}: SemestreFormModalProps) {
  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function onValid(values: FormValues) {
    onSubmit(values);
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
          <h2 className="text-lg font-semibold">Nuevo semestre</h2>

          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" {...register("nombre")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
            <Input
              id="fecha_inicio"
              type="date"
              {...register("fecha_inicio")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="fecha_fin">Fecha de fin</Label>
            <Input id="fecha_fin" type="date" {...register("fecha_fin")} />
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
