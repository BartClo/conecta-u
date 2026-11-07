"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SaldoIndicator } from "@/components/creditos/saldo-indicator";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const PROXIMAMENTE_ITEMS = ["Perfil"];

interface NavSidebarProps {
  userName: string | null;
  userEmail: string;
}

export function NavSidebar({ userName, userEmail }: NavSidebarProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="flex h-screen w-56 flex-col justify-between border-r bg-card p-4">
      <ul className="space-y-2">
        <li>
          <Link href="/cursos" className="font-medium hover:text-primary">
            Cursos
          </Link>
        </li>
        <li>
          <Link href="/calendario" className="font-medium hover:text-primary">
            Calendario
          </Link>
        </li>
        <li>
          <Link href="/grupos" className="font-medium hover:text-primary">
            Grupos
          </Link>
        </li>
        <li>
          <Link href="/ranking" className="font-medium hover:text-primary">
            Ranking
          </Link>
        </li>
        <li className="flex items-center justify-between">
          <Link href="/creditos" className="font-medium hover:text-primary">
            Créditos
          </Link>
          <SaldoIndicator />
        </li>
        <li>
          <Link href="/ia/resumenes" className="font-medium hover:text-primary">
            Asistente IA
          </Link>
        </li>
        {PROXIMAMENTE_ITEMS.map((item) => (
          <li key={item} className="text-muted-foreground">
            {item} <span className="text-xs">(Próximamente)</span>
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <p className="truncate text-sm text-muted-foreground">
          {userName ?? userEmail}
        </p>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Cerrar sesión
        </Button>
      </div>
    </nav>
  );
}
