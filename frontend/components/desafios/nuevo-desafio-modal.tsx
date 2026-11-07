"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/api-error";
import { modalVariants } from "@/lib/motion";

export interface NuevoDesafioData {
  test_id: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

interface NuevoDesafioModalProps {
  tests: { id: string; titulo: string }[];
  onSubmit: (data: NuevoDesafioData) => Promise<void>;
  onClose: () => void;
}

// datetime-local gives zone-less local time; send an absolute instant.
const aIso = (local: string) => new Date(local).toISOString();

export function NuevoDesafioModal({
  tests,
  onSubmit,
  onClose,
}: NuevoDesafioModalProps) {
  const [testId, setTestId] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!testId) return setError("Selecciona un test.");
    if (inicio && fin && new Date(fin) < new Date(inicio))
      return setError("El fin no puede ser anterior al inicio.");
    setPending(true);
    setError(null);
    const data: NuevoDesafioData = { test_id: testId };
    if (inicio) data.fecha_inicio = aIso(inicio);
    if (fin) data.fecha_fin = aIso(fin);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear el desafío."));
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
          onSubmit={handleSubmit}
          className="w-96 space-y-3 rounded-xl bg-card p-6 shadow-xl"
        >
          <h2 className="text-lg font-semibold">Nuevo desafío</h2>

          {tests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              La materia de este grupo aún no tiene tests. Crea uno primero.
            </p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="test">Test</Label>
              <select
                id="test"
                value={testId}
                onChange={(e) => setTestId(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">Selecciona un test…</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="inicio">Inicio (opcional)</Label>
            <Input
              id="inicio"
              type="datetime-local"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fin">Fin (opcional)</Label>
            <Input
              id="fin"
              type="datetime-local"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || tests.length === 0}>
              {pending ? "Creando…" : "Crear"}
            </Button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
