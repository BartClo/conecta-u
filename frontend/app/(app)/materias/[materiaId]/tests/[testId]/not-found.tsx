import Link from "next/link";

export default function TestNotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Test no encontrado</h1>
      <Link href="/grupos" className="underline">
        Volver a grupos
      </Link>
    </div>
  );
}
