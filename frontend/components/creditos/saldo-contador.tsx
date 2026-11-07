"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useReducedMotionSafe } from "@/lib/motion";

export function SaldoContador({ valor }: { valor: number }) {
  const reduced = useReducedMotionSafe();
  const [display, setDisplay] = useState(0);
  const desde = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(desde.current, valor, {
      duration: 0.6,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    desde.current = valor;
    return () => controls.stop();
  }, [valor, reduced]);

  return <span>{reduced ? valor : display}</span>;
}
