const POR_STATUS: Record<number, string> = {
  400: "Los datos enviados no son válidos.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "No tienes permiso para realizar esta acción.",
  404: "El recurso ya no existe.",
  422: "Los datos enviados no son válidos.",
};

/** Spanish message for an error thrown by the api clients ("API request failed: N"). */
export function mensajeDeError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const status = /^API request failed: (\d+)$/.exec(err.message)?.[1];
  if (!status) return err.message;
  return POR_STATUS[Number(status)] ?? "Error del servidor. Intenta de nuevo.";
}
