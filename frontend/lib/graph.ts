import { COLOR_SWATCH } from "./colors";
import type { Curso, Grupo, Miembro } from "./types";

export type TipoNodo = "yo" | "grupo" | "materia" | "curso" | "companero";

export interface GraphNode {
  id: string;
  tipo: TipoNodo;
  label: string;
  color: string;
  /** Relative size (activity): drives sphere radius. */
  val: number;
  /** Route the node opens on click, if any. */
  href?: string;
  detalle: string;
}

export interface GraphLink {
  source: string;
  target: string;
  color: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const COLOR_TIPO: Record<Exclude<TipoNodo, "curso">, string> = {
  yo: "#f5f3ff",
  grupo: "#8b5cf6",
  materia: "#fbbf24",
  companero: "#22d3ee",
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/**
 * Builds the dashboard constellation: the user at the center, their groups,
 * the materias of those groups, their courses (linked to a materia with the
 * same name) and their groupmates (linked to every shared group).
 */
export function buildGraph(
  yo: { id: string; nombre: string },
  grupos: Grupo[],
  cursos: Curso[],
  miembrosPorGrupo: Record<string, Miembro[]>,
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const materias = new Map<string, { nombre: string; grupos: number }>();
  for (const g of grupos) {
    const m = materias.get(g.materia_id);
    if (m) m.grupos += 1;
    else materias.set(g.materia_id, { nombre: g.materia_nombre, grupos: 1 });
  }

  const companeros = new Map<string, { nombre: string; grupos: string[] }>();
  for (const g of grupos) {
    for (const m of miembrosPorGrupo[g.id] ?? []) {
      if (m.user_id === yo.id) continue;
      const c = companeros.get(m.user_id);
      if (c) c.grupos.push(g.id);
      else
        companeros.set(m.user_id, {
          nombre: m.nombre ?? m.email.split("@")[0],
          grupos: [g.id],
        });
    }
  }

  nodes.push({
    id: "yo",
    tipo: "yo",
    label: yo.nombre,
    color: COLOR_TIPO.yo,
    val: 14,
    detalle: `${plural(grupos.length, "grupo", "grupos")} · ${plural(cursos.length, "curso", "cursos")}`,
  });

  for (const g of grupos) {
    const total = (miembrosPorGrupo[g.id] ?? []).length;
    nodes.push({
      id: `grupo-${g.id}`,
      tipo: "grupo",
      label: g.nombre,
      color: COLOR_TIPO.grupo,
      val: 5 + total * 1.5,
      href: `/grupos/${g.id}`,
      detalle: `Grupo · ${plural(total, "miembro", "miembros")}`,
    });
    links.push({
      source: "yo",
      target: `grupo-${g.id}`,
      color: COLOR_TIPO.grupo,
    });
    links.push({
      source: `grupo-${g.id}`,
      target: `materia-${g.materia_id}`,
      color: COLOR_TIPO.materia,
    });
  }

  const materiaPorNombre = new Map<string, string>();
  for (const [id, m] of materias) {
    materiaPorNombre.set(normalizar(m.nombre), id);
    nodes.push({
      id: `materia-${id}`,
      tipo: "materia",
      label: m.nombre,
      color: COLOR_TIPO.materia,
      val: 3 + m.grupos * 2,
      detalle: `Materia · ${plural(m.grupos, "grupo tuyo", "grupos tuyos")}`,
    });
  }

  for (const c of cursos) {
    const color = COLOR_SWATCH[c.color] ?? COLOR_SWATCH.gray;
    nodes.push({
      id: `curso-${c.id}`,
      tipo: "curso",
      label: c.nombre,
      color,
      val: 4,
      href: `/cursos/${c.id}`,
      detalle: `Curso · ${c.codigo}`,
    });
    links.push({ source: "yo", target: `curso-${c.id}`, color });
    const materiaId = materiaPorNombre.get(normalizar(c.nombre));
    if (materiaId)
      links.push({
        source: `curso-${c.id}`,
        target: `materia-${materiaId}`,
        color,
      });
  }

  for (const [id, c] of companeros) {
    nodes.push({
      id: `companero-${id}`,
      tipo: "companero",
      label: c.nombre,
      color: COLOR_TIPO.companero,
      val: 1.5 + c.grupos.length,
      detalle: `Compañero · ${plural(c.grupos.length, "grupo en común", "grupos en común")}`,
    });
    for (const g of c.grupos)
      links.push({
        source: `companero-${id}`,
        target: `grupo-${g}`,
        color: COLOR_TIPO.companero,
      });
  }

  return { nodes, links };
}
