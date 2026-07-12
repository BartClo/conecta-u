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
