// Initials avatar with a stable per-name hue, plus an overlapping stack.
const TONOS = [
  "from-primary to-cyan",
  "from-cyan to-xp",
  "from-gold to-primary",
  "from-xp to-cyan",
  "from-primary to-gold",
];

export function iniciales(nombre: string): string {
  const partes = nombre.split(/[\s@._-]+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
}

function tono(nombre: string): string {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TONOS[Math.abs(h) % TONOS.length];
}

export function Avatar({
  nombre,
  className = "size-9 text-xs",
}: {
  nombre: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-heading font-bold text-background ring-2 ring-card ${tono(nombre)} ${className}`}
    >
      {iniciales(nombre)}
    </span>
  );
}

export function AvatarStack({
  nombres,
  max = 5,
}: {
  nombres: string[];
  max?: number;
}) {
  const extra = nombres.length - max;
  return (
    <span className="flex -space-x-2">
      {nombres.slice(0, max).map((n, i) => (
        <Avatar key={`${n}-${i}`} nombre={n} className="size-7 text-[10px]" />
      ))}
      {extra > 0 && (
        <span className="grid size-7 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
          +{extra}
        </span>
      )}
    </span>
  );
}
