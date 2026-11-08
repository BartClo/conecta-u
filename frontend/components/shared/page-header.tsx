import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  // Tailwind text color class for the icon tile and eyebrow.
  tone?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}

export function PageHeader({
  title,
  eyebrow,
  description,
  icon: Icon,
  tone = "text-primary",
  actions,
  back,
}: PageHeaderProps) {
  return (
    <header className="space-y-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {Icon && (
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-2xl border bg-card/70 ${tone}`}
            >
              <Icon className="size-6" aria-hidden />
            </span>
          )}
          <div className="min-w-0 space-y-0.5">
            {eyebrow && (
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${tone}`}
              >
                {eyebrow}
              </p>
            )}
            <h1 className="font-heading text-3xl font-bold tracking-tight break-words">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
