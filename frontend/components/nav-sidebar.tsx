"use client";

import {
  BookOpen,
  CalendarDays,
  Coins,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SaldoIndicator } from "@/components/creditos/saldo-indicator";
import { clearTestSession } from "@/lib/auth/test-session";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/grupos", label: "Grupos", icon: Users },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/ia/resumenes", label: "Asistente IA", icon: Sparkles },
  { href: "/cursos", label: "Cursos", icon: BookOpen },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
];

interface NavSidebarProps {
  userName: string | null;
  userEmail: string;
}

function activo(pathname: string, href: string) {
  const base = href === "/ia/resumenes" ? "/ia" : href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function NavSidebar({ userName, userEmail }: NavSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const nombre = userName ?? userEmail;

  async function handleSignOut() {
    if (process.env.NEXT_PUBLIC_AUTH_MODE === "test") {
      clearTestSession();
    } else {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
  }

  return (
    <aside className="w-16 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur lg:w-60">
      <nav className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto px-2 py-5 lg:px-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 font-heading text-xl font-bold tracking-tight"
          aria-label="Conecta-U, inicio"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]">
            <span className="text-base leading-none">U</span>
          </span>
          <span className="hidden lg:inline">
            Conecta<span className="text-primary">-U</span>
          </span>
        </Link>

        <ul>
          <li>
            <Link
              href="/creditos"
              aria-label="Créditos"
              aria-describedby="nav-saldo"
              className={`group relative block overflow-hidden rounded-xl border border-xp/25 bg-gradient-to-br from-xp/15 via-xp/5 to-transparent p-2 transition-colors hover:border-xp/50 lg:p-3 ${activo(pathname, "/creditos") ? "ring-1 ring-xp/60" : ""}`}
            >
              <span className="hidden items-center gap-2 text-xs font-medium uppercase tracking-wider text-xp/90 lg:flex">
                <Coins className="size-3.5" aria-hidden />
                Créditos
              </span>
              <span id="nav-saldo" className="mt-1 flex h-9 items-center">
                <SaldoIndicator className="font-heading text-lg font-bold text-xp tabular lg:text-3xl" />
              </span>
              <span className="hidden text-xs text-muted-foreground lg:block">
                Gana desafíos, gasta en IA
              </span>
            </Link>
          </li>
        </ul>

        <ul className="flex-1 space-y-1">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const on = activo(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={on ? "page" : undefined}
                  title={label}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    on
                      ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon
                    className={`size-4 ${on ? "text-primary" : ""}`}
                    aria-hidden
                  />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="hidden items-center gap-3 px-3 py-2 text-sm text-muted-foreground/60 lg:flex">
            <UserRound className="size-4" aria-hidden />
            Perfil
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              Pronto
            </span>
          </li>
        </ul>

        <div className="flex flex-col items-center gap-2 rounded-xl border border-sidebar-border bg-card/60 p-2 lg:flex-row lg:gap-3 lg:p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan font-heading font-bold text-primary-foreground">
            {nombre.charAt(0).toUpperCase()}
          </span>
          <p className="hidden min-w-0 flex-1 truncate text-sm text-sidebar-foreground lg:block">
            {nombre}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </nav>
    </aside>
  );
}
