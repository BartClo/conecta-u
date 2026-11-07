// Sesion del modo de auth de prueba. Solo se lee detras de
// process.env.NEXT_PUBLIC_AUTH_MODE === "test", valor fijado en build (next.config).
// Cookie no httpOnly: el navegador la lee para llamar al API. Aceptable solo en e2e.
export const TEST_COOKIE = "conecta_test_token";

export function readTestToken(): string | null {
  const fila = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${TEST_COOKIE}=`));
  return fila ? fila.slice(TEST_COOKIE.length + 1) : null;
}

export function setTestSession(token: string) {
  document.cookie = `${TEST_COOKIE}=${token}; path=/; SameSite=Lax; max-age=43200`;
}

export function clearTestSession() {
  document.cookie = `${TEST_COOKIE}=; path=/; SameSite=Lax; max-age=0`;
}
