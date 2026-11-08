import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  icon: LucideIcon;
  // Text color class (text-xp, text-gold...) and gradient start (from-xp/20...).
  tono: string;
  borde: string;
  valor: React.ReactNode;
  etiqueta: string;
  pie?: React.ReactNode;
  href?: string;
}

export function StatCard({
  icon: Icon,
  tono,
  borde,
  valor,
  etiqueta,
  pie,
  href,
}: StatCardProps) {
  const cuerpo = (
    <>
      <span className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {etiqueta}
        </span>
        <Icon className={`size-4 ${tono}`} aria-hidden />
      </span>
      <span
        className={`mt-2 block font-heading text-4xl font-bold tabular ${tono}`}
      >
        {valor}
      </span>
      {pie && <span className="text-xs text-muted-foreground">{pie}</span>}
    </>
  );
  const clase = `block rounded-2xl border bg-gradient-to-br ${borde} to-card/40 p-4 transition-colors`;
  return href ? (
    <Link href={href} className={`${clase} hover:border-foreground/20`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}
