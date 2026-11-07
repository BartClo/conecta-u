"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiFetchClient } from "@/lib/api-client";
import type { Materia } from "@/lib/types";

const DEBOUNCE_MS = 300;

interface MateriaComboboxProps {
  value: Materia | null;
  onChange: (materia: Materia) => void;
  onError: (message: string) => void;
}

export function MateriaCombobox({
  value,
  onChange,
  onError,
}: MateriaComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [opciones, setOpciones] = useState<Materia[]>([]);

  const nombre = query.trim();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const qs = nombre ? `?q=${encodeURIComponent(nombre)}` : "";
      try {
        const data = await apiFetchClient<Materia[]>(`/api/materias${qs}`);
        if (!cancelled) setOpciones(data);
      } catch {
        if (!cancelled) setOpciones([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, nombre]);

  function select(materia: Materia) {
    onChange(materia);
    setOpen(false);
  }

  // B1-be POST /api/materias is idempotent on the normalized name.
  async function crear() {
    try {
      select(
        await apiFetchClient<Materia>("/api/materias", {
          method: "POST",
          body: { nombre },
        }),
      );
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "No se pudo crear la materia.",
      );
    }
  }

  const hayExacta = opciones.some(
    (o) => o.nombre.toLowerCase() === nombre.toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
          />
        }
      >
        {value?.nombre ?? "Seleccionar materia"}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar materia…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {opciones.map((m) => (
                <CommandItem key={m.id} value={m.id} onSelect={() => select(m)}>
                  {m.nombre}
                </CommandItem>
              ))}
              {nombre && !hayExacta && (
                <CommandItem value="__crear__" onSelect={crear}>
                  Crear materia “{nombre}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
