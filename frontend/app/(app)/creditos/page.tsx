import { CreditosClient } from "./creditos-client";
import { apiFetchServer } from "@/lib/api-server";
import type { MovimientosCreditoOut, SaldoCreditoOut } from "@/lib/types";

export default async function CreditosPage() {
  const saldo = await apiFetchServer<SaldoCreditoOut>("/api/creditos/saldo");
  const movimientos = await apiFetchServer<MovimientosCreditoOut>(
    "/api/creditos/movimientos?limit=20&offset=0",
  );
  return (
    <CreditosClient initialSaldo={saldo} initialMovimientos={movimientos} />
  );
}
