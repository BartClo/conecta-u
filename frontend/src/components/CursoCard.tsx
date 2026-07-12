import { Link } from "react-router-dom";
import { COLOR_SWATCH } from "../lib/colors";
import type { Curso } from "../lib/types";

export default function CursoCard({ curso }: { curso: Curso }) {
  return (
    <Link
      to={`/cursos/${curso.id}`}
      className="block rounded border p-4 hover:shadow"
      style={{ borderLeft: `4px solid ${COLOR_SWATCH[curso.color]}` }}
    >
      <h3 className="font-semibold">{curso.nombre}</h3>
      <p className="text-sm text-gray-500">{curso.codigo}</p>
      {curso.profesor && <p className="text-sm text-gray-500">{curso.profesor}</p>}
    </Link>
  );
}
