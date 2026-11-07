const POR_STATUS: Record<number, string> = {
  400: "Los datos enviados no son válidos.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "No tienes permiso para realizar esta acción.",
  404: "El recurso ya no existe.",
  422: "Los datos enviados no son válidos.",
};

/** Spanish message for an error thrown by the api clients ("API request failed: N"). */
export const TEST_EN_USO = {
  409: "Este test ya tiene desafíos y no se puede modificar",
};

export function mensajeDeError(
  err: unknown,
  fallback: string,
  porStatus: Record<number, string> = {},
): string {
  if (!(err instanceof Error)) return fallback;
  const status = /^API request failed: (\d+)$/.exec(err.message)?.[1];
  if (!status) return err.message;
  const n = Number(status);
  return (
    porStatus[n] ?? POR_STATUS[n] ?? "Error del servidor. Intenta de nuevo."
  );
}

/** HTTP status of an error thrown by the api clients, or null if it is not one. */
export function statusDeError(err: unknown): number | null {
  if (!(err instanceof Error)) return null;
  const status = /^API request failed: (\d+)$/.exec(err.message)?.[1];
  return status ? Number(status) : null;
}
