"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Coins,
  Gift,
  History,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SaldoContador } from "@/components/creditos/saldo-contador";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { apiFetchClient } from "@/lib/api-client";
import { mensajeDeError } from "@/lib/api-error";
import {
  COSTO_GENERAR_RESUMEN_IA,
  COSTO_GENERAR_TEST_IA,
} from "@/lib/economia";
import { useSaldo } from "@/lib/hooks/use-saldo";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { MOTIVO_CREDITO_LABEL } from "@/lib/motivosCredito";
import type {
  MotivoCredito,
  MovimientosCreditoOut,
  SaldoCreditoOut,
} from "@/lib/types";

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
  // el saldo del servidor gana sobre una caché vieja
  useEffect(() => {
    queryClient.setQueryData(["creditos", "saldo"], initialSaldo);
  }, [queryClient, initialSaldo]);
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
      setItems((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...page.items.filter((m) => !ids.has(m.id))];
      });
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
      <PageHeader
        icon={Wallet}
        tone="text-xp"
        eyebrow="Billetera"
        title="Créditos"
        description="Gánalos venciendo desafíos y úsalos en el asistente de IA."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-xp/30 bg-gradient-to-br from-xp/25 via-xp/5 to-card/60 p-6 lg:col-span-2">
          <span className="bg-grid absolute inset-0 opacity-40" aria-hidden />
          <Coins
            className="absolute -bottom-6 -right-6 size-48 text-xp/10"
            aria-hidden
          />
          <div className="relative">
            <span className="text-sm font-medium uppercase tracking-wider text-xp/90">
              Tu saldo
            </span>
            <p className="font-heading text-7xl font-black text-xp tabular drop-shadow-[0_0_30px_var(--xp)]">
              <SaldoContador valor={saldo.saldo} />
            </p>
            <span className="text-sm text-muted-foreground">
              {total} {total === 1 ? "movimiento" : "movimientos"} en tu
              historial
            </span>
          </div>
        </div>
        <div className="grid gap-3">
          <Gasto
            href="/ia/resumenes/nuevo"
            icon={ScrollText}
            titulo="Resumen con IA"
            costo={COSTO_GENERAR_RESUMEN_IA}
            saldo={saldo.saldo}
          />
          <Gasto
            href="/grupos"
            icon={Sparkles}
            titulo="Test con IA"
            costo={COSTO_GENERAR_TEST_IA}
            saldo={saldo.saldo}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card/70 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold">
          <History className="size-4 text-xp" aria-hidden />
          Historial
        </h2>
        {vacio ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Trophy className="size-8 text-gold/70" aria-hidden />
            <p className="max-w-sm text-sm text-muted-foreground">
              Todavía no has ganado ni gastado créditos.
              {total === 1 && " Empezaste con tu bono de bienvenida."}
            </p>
            <Link
              href="/grupos"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Busca un desafío en tus grupos
            </Link>
          </div>
        ) : (
          <motion.ul
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="relative space-y-1 before:absolute before:inset-y-3 before:left-[1.4rem] before:w-px before:bg-border"
          >
            {items.map((m) => {
              const { icon: Icon, clase } = ICONO_MOTIVO[m.motivo];
              return (
                <motion.li
                  key={m.id}
                  variants={staggerItem}
                  className="relative flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
                >
                  <span
                    className={`relative grid size-9 shrink-0 place-items-center rounded-xl ring-4 ring-card ${clase}`}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {MOTIVO_CREDITO_LABEL[m.motivo]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-heading text-lg font-bold tabular ${
                        m.delta > 0 ? "text-xp" : "text-destructive"
                      }`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </p>
                    <p className="text-xs text-muted-foreground tabular">
                      Saldo: {m.saldo_resultante}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}

        {loading && (
          <div className="mt-2 space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                data-testid="movimiento-skeleton"
                className="h-12 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        )}
        {!vacio && (
          <Button
            variant="outline"
            size="lg"
            className="mt-3 w-full"
            onClick={cargarMas}
            disabled={loading || items.length >= total}
          >
            Cargar más
          </Button>
        )}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}

const ICONO_MOTIVO: Record<MotivoCredito, { icon: LucideIcon; clase: string }> =
  {
    bono_inicial: { icon: Gift, clase: "bg-primary/20 text-primary" },
    gano_desafio: { icon: Trophy, clase: "bg-gold/20 text-gold" },
    genero_test_ia: { icon: Sparkles, clase: "bg-cyan/20 text-cyan" },
    genero_resumen_ia: { icon: ScrollText, clase: "bg-cyan/20 text-cyan" },
    ajuste: {
      icon: SlidersHorizontal,
      clase: "bg-muted text-muted-foreground",
    },
  };

function Gasto({
  href,
  icon: Icon,
  titulo,
  costo,
  saldo,
}: {
  href: string;
  icon: LucideIcon;
  titulo: string;
  costo: number;
  saldo: number;
}) {
  const veces = Math.floor(saldo / costo);
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border bg-card/70 p-4 transition-colors hover:border-cyan/50"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-cyan/15 text-cyan">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">
          Te alcanza para {veces} {veces === 1 ? "vez" : "veces"}
        </span>
      </span>
      <span className="font-heading text-lg font-bold text-xp tabular">
        −{costo}
      </span>
    </Link>
  );
}
