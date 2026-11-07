"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setTestSession } from "@/lib/auth/test-session";

// Solo se importa en builds con NEXT_PUBLIC_AUTH_MODE=test (ver la pagina de login).
export function TestLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/test/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setError("No se pudo iniciar sesión de prueba.");
      return;
    }
    const { access_token } = (await response.json()) as {
      access_token: string;
    };
    setTestSession(access_token);
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="space-y-1">
        <Label htmlFor="test-email">Email de prueba</Label>
        <Input
          id="test-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full">
        Entrar en modo de prueba
      </Button>
    </form>
  );
}
