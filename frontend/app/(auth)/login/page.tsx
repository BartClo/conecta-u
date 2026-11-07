"use client";

import dynamic from "next/dynamic";
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

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-10 shadow-lg">
        <h1 className="text-2xl font-semibold">Conecta-U</h1>
        <p className="text-muted-foreground">
          Tu sistema operativo para la vida universitaria
        </p>
        {TestLoginForm ? (
          <TestLoginForm />
        ) : (
          <Button onClick={handleGoogleLogin} size="lg">
            Continuar con Google
          </Button>
        )}
      </div>
    </main>
  );
}
