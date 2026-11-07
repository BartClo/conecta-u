import Link from "next/link";

export default function GrupoNotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Grupo no encontrado</h1>
      <Link href="/grupos" className="underline">
        Volver a grupos
      </Link>
    </div>
  );
}
