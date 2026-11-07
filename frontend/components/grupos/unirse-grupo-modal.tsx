"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modalVariants } from "@/lib/motion";

interface UnirseGrupoModalProps {
  onSubmit: (codigo: string) => Promise<void>;
  onClose: () => void;
}

// apiFetchClient only exposes the status inside the error message, so it is
// parsed from there instead of changing the shared client.
function mensajeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.endsWith("404")) return "Código inválido o inexistente.";
  if (message.endsWith("409")) return "Ya eres miembro de este grupo.";
  return message || "No se pudo unir al grupo.";
}

export function UnirseGrupoModal({ onSubmit, onClose }: UnirseGrupoModalProps) {
  const [codigo, setCodigo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo) return;
    setPending(true);
    setError(null);
    try {
      await onSubmit(codigo);
    } catch (err) {
      setError(mensajeError(err));
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
          className="w-80 space-y-3 rounded-xl bg-card p-6 shadow-xl"
        >
          <h2 className="text-lg font-semibold">Unirse con código</h2>

          <div className="space-y-1">
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              className="font-mono uppercase"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Uniéndose…" : "Unirse"}
            </Button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
