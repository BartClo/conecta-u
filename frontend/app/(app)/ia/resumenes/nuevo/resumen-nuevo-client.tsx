"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Lightbulb, ScrollText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { CostoBadge } from "@/components/ia/costo-badge";
import { GenerandoOverlay } from "@/components/ia/generando-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { statusDeError } from "@/lib/api-error";
import { apiFetchClient } from "@/lib/api-client";
import { COSTO_GENERAR_RESUMEN_IA } from "@/lib/economia";
import { useSaldo } from "@/lib/hooks/use-saldo";
import { mensajeGeneracion } from "@/lib/ia-error";
import type { GeneracionResumenResponse } from "@/lib/types";

const schema = z.object({
  titulo: z.string().max(150, "Máximo 150 caracteres.").optional(),
  texto_fuente: z
    .string()
    .trim()
    .min(50, "Pega al menos 50 caracteres de texto.")
    .max(50000, "Máximo 50000 caracteres."),
});

type FormValues = z.infer<typeof schema>;

// The materia selector is omitted on purpose: no reusable one exists outside
// a materia route, and the backend field is optional.
export function ResumenNuevoClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useSaldo();
  const saldo = data?.saldo;
  const sinSaldo = saldo !== undefined && saldo < COSTO_GENERAR_RESUMEN_IA;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: "", texto_fuente: "" },
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onValid(values: FormValues) {
    setPending(true);
    setError(null);
    try {
      const res = await apiFetchClient<GeneracionResumenResponse>(
        "/api/ia/resumenes",
        {
          method: "POST",
          body: {
            texto_fuente: values.texto_fuente,
            ...(values.titulo ? { titulo: values.titulo } : {}),
          },
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["creditos"] });
      router.push(`/ia/resumenes/${res.resumen.id}`);
    } catch (err) {
      // 402: el saldo mostrado quedo desactualizado, refrescarlo
      if (statusDeError(err) === 402) {
        await queryClient.invalidateQueries({ queryKey: ["creditos"] });
      }
      setError(mensajeGeneracion(err, "resumen"));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/ia/resumenes", label: "Mis resúmenes" }}
        icon={ScrollText}
        tone="text-xp"
        eyebrow="Asistente IA"
        title="Nuevo resumen con IA"
        description="Pega un texto largo y recibe sus ideas clave en segundos."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit(onValid)}
          className="relative overflow-hidden rounded-3xl border bg-card/70 p-6 lg:col-span-2"
        >
          <fieldset
            disabled={pending}
            className="space-y-4 disabled:opacity-50"
          >
            <div className="space-y-1">
              <Label htmlFor="titulo">Título (opcional)</Label>
              <Input id="titulo" {...register("titulo")} />
              {errors.titulo && (
                <p className="text-sm text-destructive">
                  {errors.titulo.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="texto_fuente">Texto a resumir</Label>
              <Textarea
                id="texto_fuente"
                rows={12}
                className="min-h-64"
                {...register("texto_fuente")}
              />
              <p className="text-right text-xs text-muted-foreground tabular">
                {(watch("texto_fuente") ?? "").trim().length} / 50000 caracteres
              </p>
              {errors.texto_fuente && (
                <p className="text-sm text-destructive">
                  {errors.texto_fuente.message}
                </p>
              )}
            </div>
            <CostoBadge costo={COSTO_GENERAR_RESUMEN_IA} saldo={saldo} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              size="lg"
              disabled={sinSaldo}
              className="bg-xp text-background hover:bg-xp/85"
            >
              <Sparkles aria-hidden />
              Generar resumen
            </Button>
          </fieldset>
          {pending && <GenerandoOverlay tipo="resumen" />}
        </form>
        <aside className="h-fit space-y-4 rounded-3xl border border-xp/20 bg-gradient-to-br from-xp/10 to-card/50 p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <Lightbulb className="size-4 text-gold" aria-hidden />
            Para un mejor resumen
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              "Pega texto limpio: apuntes, un capítulo o la transcripción de una clase.",
              "Un título claro te ayuda a encontrarlo después en tu biblioteca.",
              "Entre más contexto, mejor: mínimo 50 caracteres.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-xp" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
