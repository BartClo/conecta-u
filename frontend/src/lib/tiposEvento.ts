import type { TipoEvento } from "./types";

export const TIPOS_EVENTO: TipoEvento[] = ["examen", "entrega", "clase", "personal", "otro"];

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  examen: "Examen",
  entrega: "Entrega",
  clase: "Clase",
  personal: "Personal",
  otro: "Otro",
};

export const TIPO_EVENTO_COLOR: Record<TipoEvento, string> = {
  examen: "#ef4444",
  entrega: "#f97316",
  clase: "#3b82f6",
  personal: "#22c55e",
  otro: "#a855f7",
};

export const DIAS_SEMANA_LABEL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
