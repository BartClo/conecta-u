import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (oauthError) {
      setError(oauthError.message);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <button onClick={handleLogin} className="rounded bg-blue-600 px-4 py-2 text-white">
        Continuar con Google
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
