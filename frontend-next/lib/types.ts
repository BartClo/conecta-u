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
