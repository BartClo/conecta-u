import type { MotivoCredito } from "./types";

export const MOTIVOS_CREDITO: MotivoCredito[] = [
  "bono_inicial",
  "gano_desafio",
  "genero_test_ia",
  "genero_resumen_ia",
  "ajuste",
];

export const MOTIVO_CREDITO_LABEL: Record<MotivoCredito, string> = {
  bono_inicial: "Bono de bienvenida",
  gano_desafio: "Ganaste un desafío",
  genero_test_ia: "Generaste un test con IA",
  genero_resumen_ia: "Generaste un resumen con IA",
  ajuste: "Ajuste manual",
};
