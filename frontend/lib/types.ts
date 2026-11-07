export interface Semestre {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface Curso {
  id: string;
  semestre_id: string;
  nombre: string;
  codigo: string;
  profesor: string | null;
  color: string;
}

export interface Materia {
  id: string;
  nombre: string;
  nombre_normalizado: string;
  created_by: string;
}

export type RolMembresia = "owner" | "member";

export interface Grupo {
  id: string;
  nombre: string;
  materia_id: string;
  materia_nombre: string;
  owner_id: string;
  codigo_invitacion: string;
}

// GET /api/grupos/{id}: adds the caller's role and the member count
export interface GrupoDetalle extends Grupo {
  rol: RolMembresia;
  miembros_count: number;
}

export interface Miembro {
  user_id: string;
  nombre: string | null;
  email: string;
  rol: RolMembresia;
}

export type TipoEvento = "examen" | "entrega" | "clase" | "personal" | "otro";

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fecha_inicio: string;
  fecha_fin: string | null;
  curso_id: string | null;
  recurrencia_dia_semana: number | null;
  recurrencia_hasta: string | null;
}

export interface Ocurrencia {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fecha_inicio: string;
  fecha_fin: string | null;
  curso_id: string | null;
}

export interface Opcion {
  id: string;
  texto: string;
  orden: number;
  // Only present when the caller is the test's author.
  es_correcta?: boolean;
}

export interface Pregunta {
  id: string;
  enunciado: string;
  orden: number;
  opciones: Opcion[];
}

export type OrigenTest = "manual" | "ia";

export interface Test {
  id: string;
  materia_id: string;
  titulo: string;
  descripcion: string | null;
  autor_id: string;
  origen: OrigenTest;
  created_at: string;
  preguntas: Pregunta[];
}

// Body of POST/PUT /api/tests (built by TestEditor).
export interface TestPayload {
  materia_id: string;
  titulo: string;
  descripcion: string | null;
  preguntas: {
    enunciado: string;
    opciones: { texto: string; es_correcta: boolean }[];
  }[];
}

export type MotivoCredito =
  | "bono_inicial"
  | "gano_desafio"
  | "genero_test_ia"
  | "genero_resumen_ia"
  | "ajuste";

export interface SaldoCreditoOut {
  saldo: number;
}

export interface MovimientoCreditoOut {
  id: string;
  delta: number;
  motivo: MotivoCredito;
  ref_tipo: string | null;
  ref_id: string | null;
  saldo_resultante: number;
  created_at: string;
}

export interface MovimientosCreditoOut {
  items: MovimientoCreditoOut[];
  limit: number;
  offset: number;
  total: number;
}
