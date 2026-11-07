// Corre contra backend-supabase y web-normal (perfil qa): el mismo codigo en modo normal.
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  API_SUPABASE,
  TEST_AUTH_SECRET,
  TEST_COOKIE,
  WEB_NORMAL,
  call,
  nuevoUsuario,
} from "./helpers";

const COMPOSE = path.resolve(__dirname, "../../docker-compose.e2e.yml");

function enContenedor(servicio: string, comando: string): string {
  // Sin shell del host: el comando llega intacto a sh dentro del contenedor.
  return execFileSync(
    "docker",
    [
      "compose",
      "-f",
      COMPOSE,
      "--profile",
      "qa",
      "exec",
      "-T",
      servicio,
      "sh",
      "-c",
      comando,
    ],
    { encoding: "utf-8", env: { ...process.env, MSYS_NO_PATHCONV: "1" } },
  );
}

function b64(valor: object): string {
  return Buffer.from(JSON.stringify(valor)).toString("base64url");
}

function firmarHs256(claims: object): string {
  const cuerpo = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}`;
  const firma = createHmac("sha256", TEST_AUTH_SECRET)
    .update(cuerpo)
    .digest("base64url");
  return `${cuerpo}.${firma}`;
}

test.describe("Guardas: backend en AUTH_MODE=supabase", () => {
  test("[GUA-01] POST /api/test/login responde 404 y no figura en OpenAPI", async () => {
    const r = await call("POST", "/api/test/login", {
      base: API_SUPABASE,
      body: { email: "a@e2e.test" },
    });
    expect(r.status).toBe(404);
    const api = await call("GET", "/openapi.json", { base: API_SUPABASE });
    expect(api.text).not.toContain("/api/test/");
  });

  test("[GUA-02] un token HS256 de test emitido por el modo test da 401", async () => {
    const u = await nuevoUsuario("Bypass");
    const r = await call("GET", "/api/me", {
      base: API_SUPABASE,
      token: u.token,
    });
    expect(r.status).toBe(401);
  });

  test("[GUA-03] un token HS256 forjado con el secreto de test da 401", async () => {
    const token = firmarHs256({
      sub: "x",
      email: "x@e2e.test",
      iss: "conecta-u-e2e",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    const r = await call("GET", "/api/grupos", {
      base: API_SUPABASE,
      token,
    });
    expect(r.status).toBe(401);
  });

  test("[GUA-04] control: el modo test si acepta su propio token", async () => {
    const u = await nuevoUsuario("Control");
    expect((await u.get("/api/me")).status).toBe(200);
  });

  test("[GUA-05] backend con AUTH_MODE=test y APP_ENV=production no arranca", async () => {
    const salida = enContenedor(
      "backend-supabase",
      "AUTH_MODE=test APP_ENV=production TEST_AUTH_SECRET=" +
        TEST_AUTH_SECRET +
        " python -c 'import app.main' 2>&1; echo exit=$?",
    );
    expect(salida).toContain("AUTH_MODE=test solo se permite");
    expect(salida).not.toContain(TEST_AUTH_SECRET);
    expect(salida).toMatch(/exit=1/);
  });

  test("[GUA-06] backend con AUTH_MODE=test sin secreto no arranca", async () => {
    const salida = enContenedor(
      "backend-supabase",
      "AUTH_MODE=test APP_ENV=test python -c 'import app.main' 2>&1; echo exit=$?",
    );
    expect(salida).toContain("TEST_AUTH_SECRET");
    expect(salida).toMatch(/exit=1/);
  });
});

test.describe("Guardas: build normal de Next", () => {
  test("[GUA-07] login normal no renderiza la UI de test aunque el env de runtime diga test", async ({
    page,
  }) => {
    await page.goto(`${WEB_NORMAL}/login`);
    await expect(
      page.getByRole("button", { name: /continuar con google/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Email de prueba")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /modo de prueba/i }),
    ).toHaveCount(0);
  });

  test("[GUA-08] cookie de test forjada no da acceso en el build normal", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Forjador");
    await context.addCookies([
      { name: TEST_COOKIE, value: u.token, url: WEB_NORMAL },
    ]);
    for (const ruta of ["/dashboard", "/grupos", "/creditos"]) {
      await page.goto(`${WEB_NORMAL}${ruta}`);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("[GUA-09] el bundle normal no contiene el login de test", async () => {
    const hallados = enContenedor(
      "web-normal",
      "grep -rl -e api/test/login -e 'modo de prueba' .next/static .next/server || true",
    );
    expect(hallados.trim()).toBe("");
  });

  test("[GUA-10] control: el bundle de test si lo contiene y el secreto no esta en ninguno", async () => {
    const test_ = enContenedor(
      "web",
      "grep -rl api/test/login .next/static || true",
    );
    expect(test_.trim()).not.toBe("");
    for (const servicio of ["web", "web-normal"]) {
      const secreto = enContenedor(
        servicio,
        `grep -rl ${TEST_AUTH_SECRET} .next || true`,
      );
      expect(secreto.trim()).toBe("");
    }
  });
});
