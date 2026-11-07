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
