"use client";

import { Button } from "@/components/ui/button";

export default function CreditosError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-4">
      <p>No se pudo cargar tu billetera.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
