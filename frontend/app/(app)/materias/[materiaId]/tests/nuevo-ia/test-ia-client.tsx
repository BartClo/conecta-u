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
import { statusDeError } from "@/lib/api-error";
import { apiFetchClient } from "@/lib/api-client";
import { COSTO_GENERAR_TEST_IA } from "@/lib/economia";
import { useSaldo } from "@/lib/hooks/use-saldo";
import { mensajeGeneracion } from "@/lib/ia-error";
import type { GeneracionTestResponse } from "@/lib/types";

const schema = z.object({
  tema: z
    .string()
    .trim()
    .min(1, "Describe el tema o temario.")
    .max(2000, "Máximo 2000 caracteres."),
  texto_fuente: z.string().max(50000, "Máximo 50000 caracteres.").optional(),
  n_preguntas: z
    .number("Indica la cantidad de preguntas.")
    .int("Debe ser un número entero.")
    .min(1, "Mínimo 1 pregunta.")
    .max(20, "Máximo 20 preguntas."),
});

type FormValues = z.infer<typeof schema>;

export function TestIaClient({ materiaId }: { materiaId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useSaldo();
  const saldo = data?.saldo;
  const sinSaldo = saldo !== undefined && saldo < COSTO_GENERAR_TEST_IA;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tema: "", texto_fuente: "", n_preguntas: 10 },
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onValid(values: FormValues) {
    setPending(true);
    setError(null);
    try {
      const res = await apiFetchClient<GeneracionTestResponse>(
        "/api/ia/tests",
        {
          method: "POST",
          body: {
            materia_id: materiaId,
            tema: values.tema,
            ...(values.texto_fuente
              ? { texto_fuente: values.texto_fuente }
              : {}),
            n_preguntas: values.n_preguntas,
          },
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["creditos"] });
      router.push(`/materias/${materiaId}/tests/${res.test.id}`);
    } catch (err) {
      // 402: el saldo mostrado quedo desactualizado, refrescarlo
      if (statusDeError(err) === 402) {
        await queryClient.invalidateQueries({ queryKey: ["creditos"] });
      }
      setError(mensajeGeneracion(err, "test"));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Generar test con IA</h1>
      <form
        onSubmit={handleSubmit(onValid)}
        className="relative max-w-xl rounded-xl"
      >
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-50">
          <div className="space-y-1">
            <Label htmlFor="tema">Tema o temario</Label>
            <Textarea id="tema" {...register("tema")} />
            {errors.tema && (
              <p className="text-sm text-destructive">{errors.tema.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="texto_fuente">
              O pega un texto fuente (opcional)
            </Label>
            <Textarea id="texto_fuente" {...register("texto_fuente")} />
            {errors.texto_fuente && (
              <p className="text-sm text-destructive">
                {errors.texto_fuente.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="n_preguntas">Cantidad de preguntas</Label>
            <Input
              id="n_preguntas"
              type="number"
              {...register("n_preguntas", { valueAsNumber: true })}
            />
            {errors.n_preguntas && (
              <p className="text-sm text-destructive">
                {errors.n_preguntas.message}
              </p>
            )}
          </div>
          <CostoBadge costo={COSTO_GENERAR_TEST_IA} saldo={saldo} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={sinSaldo}>
            Generar test
          </Button>
        </fieldset>
        {pending && <GenerandoOverlay tipo="test" />}
      </form>
    </div>
  );
}
