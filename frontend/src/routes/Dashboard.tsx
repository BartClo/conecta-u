import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";

interface Me {
  name: string | null;
  email: string;
}

const NAV_ITEMS = ["Cursos", "Calendario", "Chat IA", "Perfil"];

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/me").then(setMe);
  }, []);

  return (
    <div className="flex h-screen">
      <nav className="w-56 border-r p-4">
        <ul className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <li key={item} className="text-gray-400">
              {item} <span className="text-xs">(Próximamente)</span>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between">
          <h1>Hola, {me?.name ?? me?.email ?? "..."}</h1>
          <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </div>
      </main>
    </div>
  );
}
