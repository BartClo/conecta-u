"use client";

import dynamic from "next/dynamic";
import { Sparkles, Swords, Trophy, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// Condicion literal fijada en build: un build normal no incluye el formulario.
const TestLoginForm =
  process.env.NEXT_PUBLIC_AUTH_MODE === "test"
    ? dynamic(() =>
        import("@/components/auth/test-login-form").then(
          (m) => m.TestLoginForm,
        ),
      )
    : null;

const FEATURES = [
  {
    icon: Users,
    titulo: "Grupos",
    texto: "Por materia, con tu gente",
    color: "text-primary",
  },
  {
    icon: Swords,
    titulo: "Desafíos",
    texto: "Tests contra el reloj",
    color: "text-cyan",
  },
  {
    icon: Trophy,
    titulo: "Ranking",
    texto: "Escala posiciones",
    color: "text-gold",
  },
  {
    icon: Sparkles,
    titulo: "Créditos IA",
    texto: "Gana y gasta en IA",
    color: "text-xp",
  },
];

const PODIO = [
  { puesto: 2, alto: "h-2/3", clase: "bg-primary/25 text-primary" },
  { puesto: 1, alto: "h-full", clase: "bg-gold/30 text-gold" },
  { puesto: 3, alto: "h-1/2", clase: "bg-cyan/20 text-cyan" },
];

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.2fr_1fr]">
      <section className="bg-grid relative flex flex-col justify-between gap-10 p-10 lg:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/3 size-[36rem] rounded-full bg-primary/20 blur-[120px]"
        />
        <p className="relative flex items-center gap-2 font-heading text-xl font-bold">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_32px_-4px_var(--primary)]">
            U
          </span>
          Conecta-U
        </p>
        <div className="relative max-w-xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-xp/30 bg-xp/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-xp">
            <Zap className="size-3.5" aria-hidden /> Temporada abierta
          </span>
          <h1 className="font-heading text-5xl font-extrabold leading-[1.02] tracking-tight lg:text-6xl">
            Estudia en equipo.
            <br />
            <span className="text-gradient">Compite. Sube.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Forma grupos por materia, resuelve desafíos contra tus compañeros,
            escala el ranking y gana créditos para usar la IA.
          </p>
          <ul className="grid grid-cols-2 gap-3 text-sm">
            {FEATURES.map(({ icon: Icon, titulo, texto, color }) => (
              <li
                key={titulo}
                className="rounded-xl border bg-card/50 p-3 backdrop-blur"
              >
                <Icon className={`mb-2 size-5 ${color}`} aria-hidden />
                <p className="font-semibold">{titulo}</p>
                <p className="text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">
          Tu sistema operativo para la vida universitaria
        </p>
      </section>
      <section className="flex items-center justify-center border-l bg-card/40 p-8 backdrop-blur">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="font-heading text-2xl font-bold">
              Entra a la arena
            </h2>
            <p className="text-sm text-muted-foreground">
              Usa tu cuenta universitaria para continuar.
            </p>
          </div>
          {TestLoginForm ? (
            <TestLoginForm />
          ) : (
            <Button onClick={handleGoogleLogin} size="lg" className="w-full">
              Continuar con Google
            </Button>
          )}
          <div
            aria-hidden
            className="rounded-2xl border bg-background/60 p-4 text-xs text-muted-foreground"
          >
            <p className="mb-3 font-medium uppercase tracking-wider">
              Podio de la semana
            </p>
            <div className="flex h-28 items-end gap-2">
              {PODIO.map(({ puesto, alto, clase }) => (
                <div
                  key={puesto}
                  className={`flex flex-1 items-start justify-center rounded-t-lg pt-2 font-heading text-lg font-bold ${alto} ${clase}`}
                >
                  #{puesto}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
