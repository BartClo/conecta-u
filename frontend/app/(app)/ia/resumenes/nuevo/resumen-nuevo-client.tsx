"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CostoBadge } from "@/components/ia/costo-badge";
import { GenerandoOverlay } from "@/components/ia/generando-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetchClient } from "@/lib/api-client";
import { COSTO_GENERAR_RESUMEN_IA } from "@/lib/economia";
import { useSaldo } from "@/lib/hooks/use-saldo";
import { mensajeGeneracion } from "@/lib/ia-error";
import type { GeneracionResumenResponse } from "@/lib/types";

const schema = z.object({
  titulo: z.string().max(150, "Máximo 150 caracteres.").optional(),
  texto_fuente: z
    .string()
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
      setError(mensajeGeneracion(err, "resumen"));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo resumen con IA</h1>
      <form
        onSubmit={handleSubmit(onValid)}
        className="relative max-w-xl rounded-xl"
      >
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-50">
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
              rows={10}
              {...register("texto_fuente")}
            />
            {errors.texto_fuente && (
              <p className="text-sm text-destructive">
                {errors.texto_fuente.message}
              </p>
            )}
          </div>
          <CostoBadge costo={COSTO_GENERAR_RESUMEN_IA} saldo={saldo} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={sinSaldo}>
            Generar resumen
          </Button>
        </fieldset>
        {pending && <GenerandoOverlay tipo="resumen" />}
      </form>
    </div>
  );
}
