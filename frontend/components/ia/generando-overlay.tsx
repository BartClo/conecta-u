"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useReducedMotionSafe } from "@/lib/motion";

const MENSAJES = {
  test: [
    "Pensando en buenas preguntas...",
    "Armando las opciones...",
    "Verificando que tenga sentido...",
    "Casi listo...",
  ],
  resumen: [
    "Leyendo el texto...",
    "Identificando las ideas clave...",
    "Redactando el resumen...",
    "Casi listo...",
  ],
};

export function GenerandoOverlay({ tipo }: { tipo: "test" | "resumen" }) {
  const reduced = useReducedMotionSafe();
  const [i, setI] = useState(0);
  const mensajes = MENSAJES[tipo];

  useEffect(() => {
    const id = setInterval(
      () => setI((n) => Math.min(n + 1, mensajes.length - 1)),
      2500,
    );
    return () => clearInterval(id);
  }, [mensajes.length]);

  return (
    <div
      role="status"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/70"
    >
      <motion.div
        data-testid="pulso"
        className="size-4 rounded-full bg-primary"
        animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {reduced ? (
        <p className="text-sm font-medium">{mensajes[i]}</p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm font-medium"
          >
            {mensajes[i]}
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}
