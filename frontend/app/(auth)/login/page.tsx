"use client";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

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
        <Button onClick={handleGoogleLogin} size="lg">
          Continuar con Google
        </Button>
      </div>
    </main>
  );
}
