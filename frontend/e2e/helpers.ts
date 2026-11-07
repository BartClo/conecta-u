import { randomUUID } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:8001";
export const API_SUPABASE =
  process.env.E2E_API_SUPABASE_URL ?? "http://localhost:8002";
export const WEB_NORMAL =
  process.env.E2E_WEB_NORMAL_URL ?? "http://localhost:3002";
export const WEB = process.env.E2E_BASE_URL ?? "http://localhost:3001";
export const TEST_COOKIE = "conecta_test_token";
export const TEST_AUTH_SECRET =
  "e2e-only-secret-not-used-anywhere-else-0123456789";

export const unico = (prefijo: string) =>
  `${prefijo}-${randomUUID().slice(0, 8)}`;

export interface Respuesta {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  text: string;
  headers: Headers;
}

export async function call(
  method: string,
  path: string,
  {
    token,
    body,
    base = API,
  }: { token?: string; body?: unknown; base?: string },
): Promise<Respuesta> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Respuestas vacias o no JSON: el test mira `text`.
  }
  return { status: res.status, body: parsed, text, headers: res.headers };
}

export class Usuario {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly name: string,
    readonly token: string,
  ) {}
  get = (path: string) => call("GET", path, { token: this.token });
  post = (path: string, body?: unknown) =>
    call("POST", path, { token: this.token, body });
  put = (path: string, body?: unknown) =>
    call("PUT", path, { token: this.token, body });
  del = (path: string) => call("DELETE", path, { token: this.token });

  async saldo(): Promise<number> {
    return (await this.get("/api/creditos/saldo")).body.saldo;
  }
  async movimientos(): Promise<{ motivo: string; delta: number }[]> {
    return (await this.get("/api/creditos/movimientos?limit=100")).body.items;
  }
}

export async function nuevoUsuario(
  nombre = "Usuario",
  { conNombre = true } = {},
): Promise<Usuario> {
  const email = `${unico(nombre.toLowerCase())}@e2e.test`;
  const name = `${nombre} ${randomUUID().slice(0, 4)}`;
  const r = await call("POST", "/api/test/login", {
    body: { email, ...(conNombre ? { name } : {}) },
  });
  if (r.status !== 200) throw new Error(`login ${r.status}: ${r.text}`);
  return new Usuario(r.body.user_id, email, name, r.body.access_token);
}

/** Sesion de navegador del usuario, con la misma cookie que deja el login de test. */
export async function entrar(context: BrowserContext, u: Usuario) {
  await context.addCookies([
    { name: TEST_COOKIE, value: u.token, url: WEB, sameSite: "Lax" },
  ]);
}

export function aceptarDialogos(page: Page) {
  page.on("dialog", (d) => void d.accept());
}

function ok<T extends Respuesta>(r: T, esperado: number): T {
  if (r.status !== esperado) {
    throw new Error(
      `setup: esperaba ${esperado}, recibio ${r.status}: ${r.text}`,
    );
  }
  return r;
}

export async function crearMateria(u: Usuario) {
  const r = await u.post("/api/materias", { nombre: unico("Materia") });
  return ok(r, 201).body as { id: string; nombre: string };
}

export async function crearGrupo(u: Usuario, materiaId: string) {
  const r = await u.post("/api/grupos", {
    nombre: unico("Grupo"),
    materia_id: materiaId,
  });
  return ok(r, 201).body as {
    id: string;
    nombre: string;
    codigo_invitacion: string;
    materia_id: string;
  };
}

export async function unirse(u: Usuario, codigo: string) {
  return ok(await u.post("/api/grupos/unirse", { codigo }), 201).body;
}

export const payloadTest = (materiaId: string, titulo = unico("Test")) => ({
  materia_id: materiaId,
  titulo,
  preguntas: [1, 2].map((n) => ({
    enunciado: `Pregunta ${n}`,
    opciones: [
      { texto: `Correcta ${n}`, es_correcta: true },
      { texto: `Incorrecta ${n}`, es_correcta: false },
    ],
  })),
});

export interface TestAutor {
  id: string;
  titulo: string;
  materia_id: string;
  preguntas: {
    id: string;
    enunciado: string;
    opciones: { id: string; texto: string; es_correcta: boolean }[];
  }[];
}

export async function crearTest(u: Usuario, materiaId: string) {
  const r = await u.post("/api/tests", payloadTest(materiaId));
  return ok(r, 201).body as TestAutor;
}

export async function crearDesafio(
  u: Usuario,
  grupoId: string,
  testId: string,
  fechas: { fecha_inicio?: string; fecha_fin?: string } = {},
) {
  const r = await u.post(`/api/grupos/${grupoId}/desafios`, {
    test_id: testId,
    ...fechas,
  });
  return ok(r, 201).body as { id: string; grupo_id: string; test_id: string };
}

/** Respuestas con `aciertos` preguntas correctas, tomadas del test visto por su autor. */
export function respuestas(test: TestAutor, aciertos: number) {
  return test.preguntas.map((p, i) => ({
    pregunta_id: p.id,
    opcion_id: p.opciones.find((o) => o.es_correcta === i < aciertos)!.id,
  }));
}

export async function rendir(
  u: Usuario,
  desafioId: string,
  test: TestAutor,
  aciertos: number,
  segundos = 30,
) {
  const r = await u.post(`/api/desafios/${desafioId}/intentos`, {
    segundos,
    respuestas: respuestas(test, aciertos),
  });
  return ok(r, 201).body;
}

export const hace = (horas: number) =>
  new Date(Date.now() - horas * 3_600_000).toISOString();

/** Escenario base: autor/owner con grupo, test, desafio abierto y dos miembros. */
export async function escenarioDesafio() {
  const owner = await nuevoUsuario("Owner");
  const b = await nuevoUsuario("Bea");
  const c = await nuevoUsuario("Ciro");
  const materia = await crearMateria(owner);
  const grupo = await crearGrupo(owner, materia.id);
  await unirse(b, grupo.codigo_invitacion);
  await unirse(c, grupo.codigo_invitacion);
  const test = await crearTest(owner, materia.id);
  const desafio = await crearDesafio(owner, grupo.id, test.id);
  return { owner, b, c, materia, grupo, test, desafio };
}

/** Deja el saldo en `resto` gastando en generaciones de test (20 c/u, parte de 100). */
export async function gastarHasta(
  u: Usuario,
  materiaId: string,
  resto: number,
) {
  await u.saldo(); // crea la cuenta con el bono
  for (let s = 100; s > resto; s -= 20) {
    ok(
      await u.post("/api/ia/tests", {
        materia_id: materiaId,
        tema: "relleno",
        n_preguntas: 1,
      }),
      201,
    );
  }
}
