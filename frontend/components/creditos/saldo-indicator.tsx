"use client";

import { SaldoContador } from "@/components/creditos/saldo-contador";
import { useSaldo } from "@/lib/hooks/use-saldo";

export function SaldoIndicator() {
  const { data, isLoading } = useSaldo();
  if (isLoading) {
    return (
      <span
        data-testid="saldo-skeleton"
        className="h-4 w-8 animate-pulse rounded bg-muted"
      />
    );
  }
  // On error there is no data: omit the number, the link still works.
  if (!data) return null;
  return (
    <span className="text-sm font-semibold text-primary">
      <SaldoContador valor={data.saldo} />
    </span>
  );
}
