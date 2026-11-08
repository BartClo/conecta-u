import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  titulo: string;
  texto: React.ReactNode;
  // Tailwind text color for the illustration.
  tono?: string;
  action?: React.ReactNode;
}

/** Centered illustration (orbiting rings around an icon) + copy + CTA. */
export function EmptyState({
  icon: Icon,
  titulo,
  texto,
  tono = "text-primary",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/30 px-6 py-12 text-center">
      <span className={`relative grid size-24 place-items-center ${tono}`}>
        <span className="absolute inset-0 rounded-full border border-current opacity-15" />
        <span className="absolute inset-3 rounded-full border border-current opacity-25" />
        <span className="absolute inset-0 rounded-full bg-current opacity-10 blur-2xl" />
        <span className="absolute right-2 top-3 size-1.5 rounded-full bg-current opacity-70" />
        <span className="absolute bottom-4 left-1 size-1 rounded-full bg-current opacity-50" />
        <span className="relative grid size-12 place-items-center rounded-2xl border border-current/30 bg-card">
          <Icon className="size-6" aria-hidden />
        </span>
      </span>
      <p className="font-heading text-lg font-semibold">{titulo}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{texto}</p>
      {action && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
