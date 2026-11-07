import { useQuery } from "@tanstack/react-query";
import { apiFetchClient } from "@/lib/api-client";
import type { SaldoCreditoOut } from "@/lib/types";

// Shared by the nav and /creditos. Flows that spend credits (phase D) must
// call queryClient.invalidateQueries({ queryKey: ["creditos"] }) on success.
export function useSaldo(initialData?: SaldoCreditoOut) {
  return useQuery({
    queryKey: ["creditos", "saldo"],
    queryFn: () => apiFetchClient<SaldoCreditoOut>("/api/creditos/saldo"),
    staleTime: 30_000,
    initialData,
  });
}
