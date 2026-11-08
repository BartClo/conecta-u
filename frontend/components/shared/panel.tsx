import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface PanelProps {
  titulo: React.ReactNode;
  icon: LucideIcon;
  tono: string;
  href?: string;
  extra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Panel({
  titulo,
  icon: Icon,
  tono,
  href,
  extra,
  className = "",
  children,
}: PanelProps) {
  return (
    <section
      className={`h-full rounded-2xl border bg-card/70 p-4 backdrop-blur ${className}`}
    >
      <header className="mb-3 flex items-center gap-2">
        <Icon className={`size-4 ${tono}`} aria-hidden />
        <h2 className="font-heading text-base font-semibold">{titulo}</h2>
        {extra && <span className="ml-auto">{extra}</span>}
        {href && (
          <Link
            href={href}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Ver todo
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
