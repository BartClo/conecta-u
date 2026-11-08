"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
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
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 rounded-[inherit] bg-background/85 backdrop-blur-sm"
    >
      <div className="relative grid size-24 place-items-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-xp border-r-primary"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-3 rounded-full border-2 border-transparent border-b-cyan"
          animate={reduced ? undefined : { rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          data-testid="pulso"
          className="grid size-11 place-items-center rounded-full bg-xp/20 text-xp shadow-[0_0_40px_-4px_var(--xp)]"
          animate={reduced ? undefined : { scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="size-5" aria-hidden />
        </motion.div>
      </div>
      {reduced ? (
        <p className="font-heading text-base font-semibold">{mensajes[i]}</p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="font-heading text-base font-semibold"
          >
            {mensajes[i]}
          </motion.p>
        </AnimatePresence>
      )}
      <div className="flex gap-1.5" aria-hidden>
        {mensajes.map((_, n) => (
          <span
            key={n}
            className={`h-1.5 rounded-full transition-all duration-500 ${n <= i ? "w-6 bg-xp" : "w-1.5 bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}
