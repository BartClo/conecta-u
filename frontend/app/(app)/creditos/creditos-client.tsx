"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { SaldoContador } from "@/components/creditos/saldo-contador";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { mensajeDeError } from "@/lib/api-error";
import { useSaldo } from "@/lib/hooks/use-saldo";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { MOTIVO_CREDITO_LABEL } from "@/lib/motivosCredito";
import type { MovimientosCreditoOut, SaldoCreditoOut } from "@/lib/types";

const LIMIT = 20;

interface CreditosClientProps {
  initialSaldo: SaldoCreditoOut;
  initialMovimientos: MovimientosCreditoOut;
}

export function CreditosClient({
  initialSaldo,
  initialMovimientos,
}: CreditosClientProps) {
  const queryClient = useQueryClient();
  // initialData guarantees data is defined
  const saldo = useSaldo(initialSaldo).data as SaldoCreditoOut;
  const [items, setItems] = useState(initialMovimientos.items);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(initialMovimientos.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarMas() {
    const next = offset + LIMIT;
    setLoading(true);
    setError(null);
    try {
      const page = await queryClient.fetchQuery({
        queryKey: ["creditos", "movimientos", { limit: LIMIT, offset: next }],
        queryFn: () =>
          apiFetchClient<MovimientosCreditoOut>(
            `/api/creditos/movimientos?limit=${LIMIT}&offset=${next}`,
          ),
      });
      setItems((prev) => [...prev, ...page.items]);
      setTotal(page.total);
      setOffset(next);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudieron cargar más movimientos."));
    } finally {
      setLoading(false);
    }
  }

  const vacio =
    total === 0 || (total === 1 && items[0]?.motivo === "bono_inicial");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tu saldo</p>
        <p className="text-5xl font-bold">
          <SaldoContador valor={saldo.saldo} />
        </p>
      </div>

      {vacio ? (
        <p className="text-muted-foreground">
          Todavía no has ganado ni gastado créditos.
          {total === 1 && " Empezaste con tu bono de bienvenida."}
        </p>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {items.map((m) => (
            <motion.li
              key={m.id}
              variants={staggerItem}
              className="flex items-center justify-between rounded border bg-card p-3"
            >
              <div>
                <p className="font-medium">{MOTIVO_CREDITO_LABEL[m.motivo]}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString("es-CL")}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={
                    m.delta > 0
                      ? "font-semibold text-green-600"
                      : "font-semibold text-red-600"
                  }
                >
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </p>
                <p className="text-xs text-muted-foreground">
                  Saldo: {m.saldo_resultante}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="movimiento-skeleton"
              className="h-12 animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      )}
      {!vacio && (
        <Button
          variant="outline"
          onClick={cargarMas}
          disabled={loading || items.length >= total}
        >
          Cargar más
        </Button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
