import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";

interface Me {
  name: string | null;
  email: string;
}

const PROXIMAMENTE_ITEMS = ["Calendario", "Chat IA", "Perfil"];

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<Me>("/api/me")
      .then(setMe)
      .catch(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      });
  }, [navigate]);

  return (
    <div className="flex h-screen">
      <nav className="w-56 border-r p-4">
        <ul className="space-y-2">
          <li>
            <Link to="/cursos">Cursos</Link>
          </li>
          {PROXIMAMENTE_ITEMS.map((item) => (
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
