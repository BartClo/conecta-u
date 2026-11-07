// Ataques deliberados contra el API y la app. Ver guardas.spec.ts para el modo normal.
import { expect, test } from "@playwright/test";
import {
  TEST_AUTH_SECRET,
  aceptarDialogos,
  call,
  crearDesafio,
  crearGrupo,
  crearMateria,
  crearTest,
  entrar,
  escenarioDesafio,
  gastarHasta,
  nuevoUsuario,
  payloadTest,
  rendir,
  respuestas,
  unico,
  unirse,
} from "./helpers";

test.describe("IDOR horizontal", () => {
  test("[IDOR-01] grupo ajeno: GET/PUT/DELETE, miembros, leaderboard y codigo", async () => {
    const b = await nuevoUsuario("Victima");
    const a = await nuevoUsuario("Atacante");
    const g = await crearGrupo(b, (await crearMateria(b)).id);
    const respuestasAtaque = [
      await a.get(`/api/grupos/${g.id}`),
      await a.put(`/api/grupos/${g.id}`, { nombre: "x" }),
      await a.del(`/api/grupos/${g.id}`),
      await a.get(`/api/grupos/${g.id}/miembros`),
      await a.post(`/api/grupos/${g.id}/codigo`),
      await a.get(`/api/grupos/${g.id}/leaderboard`),
      await a.get(`/api/grupos/${g.id}/desafios`),
      await a.del(`/api/grupos/${g.id}/miembros/${b.id}`),
    ];
    for (const r of respuestasAtaque) {
      expect([403, 404]).toContain(r.status);
      expect(r.text).not.toContain(g.codigo_invitacion);
    }
    expect((await b.get(`/api/grupos/${g.id}`)).body.nombre).toBe(g.nombre);
  });

  test("[IDOR-02] test ajeno: PUT/DELETE 403 y GET sin es_correcta", async () => {
    const b = await nuevoUsuario("Victima");
    const a = await nuevoUsuario("Atacante");
    const m = await crearMateria(b);
    const t = await crearTest(b, m.id);
    expect((await a.put(`/api/tests/${t.id}`, payloadTest(m.id))).status).toBe(
      403,
    );
    expect((await a.del(`/api/tests/${t.id}`)).status).toBe(403);
    const get = await a.get(`/api/tests/${t.id}`);
    expect(get.status).toBe(200);
    expect(get.text).not.toContain("es_correcta");
    const lista = await a.get(`/api/tests?materia_id=${m.id}`);
    expect(lista.text).not.toContain("es_correcta");
    const propio = await b.get(`/api/tests/${t.id}`);
    expect(propio.text).toContain("es_correcta");
  });

  test("[IDOR-03] desafio e intento de grupo ajeno dan 404", async () => {
    const { b, test: t, desafio, grupo } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 1);
    const a = await nuevoUsuario("Atacante");
    const intentos = [
      a.get(`/api/desafios/${desafio.id}`),
      a.get(`/api/desafios/${desafio.id}/rendir`),
      a.get(`/api/desafios/${desafio.id}/intentos/me`),
      a.get(`/api/desafios/${desafio.id}/ranking`),
      a.get(`/api/desafios/${desafio.id}/resultados`),
      a.post(`/api/desafios/${desafio.id}/cerrar`),
      a.post(`/api/desafios/${desafio.id}/intentos`, {
        segundos: 1,
        respuestas: respuestas(t, 2),
      }),
      a.post(`/api/grupos/${grupo.id}/desafios`, { test_id: t.id }),
    ];
    for (const r of await Promise.all(intentos)) {
      expect(r.status).toBe(404);
      expect(r.text).not.toContain(b.email);
    }
  });

  test("[IDOR-04] semestre, curso y evento ajenos dan 404", async () => {
    const b = await nuevoUsuario("Victima");
    const a = await nuevoUsuario("Atacante");
    const s = (
      await b.post("/api/semestres", {
        nombre: "S",
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-06-30",
      })
    ).body;
    const c = (
      await b.post("/api/cursos", {
        semestre_id: s.id,
        nombre: "C",
        codigo: "X",
        color: (await coloresValidos())[0],
      })
    ).body;
    const e = (
      await b.post("/api/eventos", {
        titulo: "E",
        tipo: "personal",
        fecha_inicio: "2026-03-02T10:00:00",
      })
    ).body;
    const rutas = [
      `/api/semestres/${s.id}`,
      `/api/cursos/${c.id}`,
      `/api/eventos/${e.id}`,
    ];
    for (const ruta of rutas) {
      expect((await a.get(ruta)).status, `GET ${ruta}`).toBe(404);
      expect((await a.del(ruta)).status, `DELETE ${ruta}`).toBe(404);
    }
    const puts = [
      await a.put(rutas[0], {
        nombre: "x",
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-06-30",
      }),
      await a.put(rutas[1], {
        semestre_id: s.id,
        nombre: "x",
        codigo: "x",
        color: (await coloresValidos())[0],
      }),
      await a.put(rutas[2], {
        titulo: "x",
        tipo: "personal",
        fecha_inicio: "2026-03-02T10:00:00",
      }),
    ];
    for (const r of puts) expect(r.status).toBe(404);
    expect((await a.get(`/api/cursos?semestre_id=${s.id}`)).body).toEqual([]);
    expect((await b.get(rutas[1])).body.nombre).toBe("C");
  });

  test("[IDOR-05] colgar recursos propios de padres ajenos se rechaza", async () => {
    const b = await nuevoUsuario("Victima");
    const a = await nuevoUsuario("Atacante");
    const s = (
      await b.post("/api/semestres", {
        nombre: "S",
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-06-30",
      })
    ).body;
    const color = (await coloresValidos())[0];
    const curso = (
      await b.post("/api/cursos", {
        semestre_id: s.id,
        nombre: "C",
        codigo: "X",
        color,
      })
    ).body;
    const enSemestreAjeno = await a.post("/api/cursos", {
      semestre_id: s.id,
      nombre: "intruso",
      codigo: "I",
      color,
    });
    expect([403, 404]).toContain(enSemestreAjeno.status);
    const enCursoAjeno = await a.post("/api/eventos", {
      titulo: "intruso",
      tipo: "personal",
      fecha_inicio: "2026-03-02T10:00:00",
      curso_id: curso.id,
    });
    expect([403, 404]).toContain(enCursoAjeno.status);
    expect((await b.get(`/api/cursos?semestre_id=${s.id}`)).body).toHaveLength(
      1,
    );
  });

  test("[IDOR-06] resumen ajeno da 404 y no aparece en el listado", async () => {
    const b = await nuevoUsuario("Victima");
    const a = await nuevoUsuario("Atacante");
    const r = await b.post("/api/ia/resumenes", {
      texto_fuente: "secreto ".repeat(10),
    });
    expect((await a.get(`/api/ia/resumenes/${r.body.resumen.id}`)).status).toBe(
      404,
    );
    expect((await a.get("/api/ia/resumenes")).body).toEqual([]);
  });

  test("[IDOR-07] pagina de grupo y de desafio ajenos no muestran datos", async ({
    page,
    context,
  }) => {
    const { test: t, desafio, grupo } = await escenarioDesafio();
    await entrar(context, await nuevoUsuario("Atacante"));
    await page.goto(`/grupos/${grupo.id}/desafios/${desafio.id}`);
    await expect(page.getByText("Desafío no encontrado")).toBeVisible();
    await expect(page.getByText(t.titulo)).toHaveCount(0);
    await expect(page.getByText("Pregunta 1")).toHaveCount(0);
  });

  test("[IDOR-08] expulsado pierde acceso y el codigo viejo no sirve", async () => {
    const { owner, b, grupo, desafio } = await escenarioDesafio();
    expect(
      (await owner.del(`/api/grupos/${grupo.id}/miembros/${b.id}`)).status,
    ).toBe(204);
    expect((await b.get(`/api/grupos/${grupo.id}`)).status).toBe(404);
    expect((await b.get(`/api/desafios/${desafio.id}/rendir`)).status).toBe(
      404,
    );
    const again = await b.post("/api/grupos/unirse", {
      codigo: grupo.codigo_invitacion,
    });
    expect(again.status).toBe(404);
  });

  test("[IDOR-09] sin token o con basura todo endpoint privado da 401", async () => {
    const rutas = [
      "/api/me",
      "/api/grupos",
      "/api/semestres",
      "/api/materias",
      "/api/creditos/saldo",
      "/api/ia/resumenes",
    ];
    for (const ruta of rutas) {
      expect((await call("GET", ruta, {})).status, ruta).toBe(401);
      expect((await call("GET", ruta, { token: "basura" })).status, ruta).toBe(
        401,
      );
    }
  });
});

test.describe("Autorizacion vertical", () => {
  test("[VERT-01] member no puede acciones de owner (403)", async () => {
    const { owner, b, c, grupo, desafio } = await escenarioDesafio();
    const r = [
      await b.put(`/api/grupos/${grupo.id}`, { nombre: "x" }),
      await b.del(`/api/grupos/${grupo.id}`),
      await b.post(`/api/grupos/${grupo.id}/codigo`),
      await b.del(`/api/grupos/${grupo.id}/miembros/${c.id}`),
      await b.del(`/api/grupos/${grupo.id}/miembros/${owner.id}`),
      await b.post(`/api/desafios/${desafio.id}/cerrar`),
    ];
    for (const x of r) expect(x.status).toBe(403);
    expect(
      (await owner.get(`/api/grupos/${grupo.id}`)).body.miembros_count,
    ).toBe(3);
  });

  test("[VERT-02] la UI de member no muestra Cerrar desafio antes de fecha_fin", async ({
    page,
    context,
  }) => {
    const { b, test: t, desafio, grupo } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 1);
    await entrar(context, b);
    aceptarDialogos(page);
    await page.goto(`/grupos/${grupo.id}/desafios/${desafio.id}`);
    await expect(page.getByText("Ranking del desafío")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cerrar desafío" }),
    ).toHaveCount(0);
  });

  test("[VERT-03] owner no puede salir de su propio grupo (409)", async () => {
    const { owner, grupo } = await escenarioDesafio();
    expect(
      (await owner.del(`/api/grupos/${grupo.id}/miembros/${owner.id}`)).status,
    ).toBe(409);
  });
});

test.describe("Fuga de es_correcta", () => {
  test("[FUGA-01] JSON crudo de rendir no trae es_correcta, ni para el autor", async () => {
    const { owner, b, desafio } = await escenarioDesafio();
    for (const u of [b, owner]) {
      const r = await u.get(`/api/desafios/${desafio.id}/rendir`);
      expect(r.status).toBe(200);
      expect(r.text).not.toContain("es_correcta");
    }
    const lista = await b.get(`/api/desafios/${desafio.id}`);
    expect(lista.text).not.toContain("es_correcta");
  });

  test("[FUGA-02] la pagina de rendir no filtra la respuesta en el HTML", async ({
    page,
    context,
  }) => {
    const { b, desafio, grupo } = await escenarioDesafio();
    await entrar(context, b);
    const res = await page.goto(`/grupos/${grupo.id}/desafios/${desafio.id}`);
    expect(await res!.text()).not.toContain("es_correcta");
    await expect(page.getByText("✓ Correcta")).toHaveCount(0);
  });

  test("[FUGA-03] no autor en /materias/.../tests/{id} no ve la marca de correcta", async ({
    page,
    context,
  }) => {
    const autor = await nuevoUsuario("Autor");
    const m = await crearMateria(autor);
    const t = await crearTest(autor, m.id);
    await entrar(context, await nuevoUsuario("Curioso"));
    const res = await page.goto(`/materias/${m.id}/tests/${t.id}`);
    await expect(page.getByRole("heading", { name: t.titulo })).toBeVisible();
    await expect(page.getByText("✓ Correcta")).toHaveCount(0);
    expect(await res!.text()).not.toContain("es_correcta");
  });

  test("[FUGA-04] materia ranking no expone email aun sin nombre", async () => {
    const owner = await nuevoUsuario("Owner");
    const sinNombre = await nuevoUsuario("Anon", { conNombre: false });
    const otro = await nuevoUsuario("Otro");
    const m = await crearMateria(owner);
    const g = await crearGrupo(owner, m.id);
    await unirse(sinNombre, g.codigo_invitacion);
    await unirse(otro, g.codigo_invitacion);
    const t = await crearTest(owner, m.id);
    const d = await crearDesafio(owner, g.id, t.id);
    await rendir(sinNombre, d.id, t, 2);
    await rendir(otro, d.id, t, 1);
    await owner.post(`/api/desafios/${d.id}/cerrar`);
    const r = await otro.get(`/api/materias/${m.id}/ranking`);
    expect(r.text).not.toContain(sinNombre.email);
    expect(r.text).toContain("Estudiante");
  });
});

test.describe("Integridad economica", () => {
  test("[ECO-01] gastar sin saldo da 402 sin movimiento ni generacion", async () => {
    const u = await nuevoUsuario("Pobre");
    const m = await crearMateria(u);
    await gastarHasta(u, m.id, 0);
    const antes = await u.movimientos();
    const r = await u.post("/api/ia/resumenes", {
      texto_fuente: "t".repeat(60),
    });
    expect(r.status).toBe(402);
    expect(await u.movimientos()).toEqual(antes);
    expect((await u.get("/api/ia/resumenes")).body).toEqual([]);
  });

  test("[ECO-02] cierre concurrente paga un solo gano_desafio", async () => {
    const { owner, b, c, test: t, desafio } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    await b.saldo();
    const r = await Promise.all(
      Array.from({ length: 10 }, () =>
        owner.post(`/api/desafios/${desafio.id}/cerrar`),
      ),
    );
    for (const x of r) {
      expect(x.status).toBe(200);
      expect(x.body.ganador_user_id).toBe(b.id);
    }
    const premios = (await b.movimientos()).filter(
      (m) => m.motivo === "gano_desafio",
    );
    expect(premios).toHaveLength(1);
    expect(await b.saldo()).toBe(115);
  });

  test("[ECO-03] puntaje y total manipulados por el cliente se ignoran", async () => {
    const { b, test: t, desafio } = await escenarioDesafio();
    const r = await b.post(`/api/desafios/${desafio.id}/intentos`, {
      segundos: 10,
      puntaje: 9999,
      total: 9999,
      user_id: "otro",
      respuestas: respuestas(t, 0),
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ puntaje: 0, total: 2, user_id: b.id });
  });

  test("[ECO-04] respuestas invalidas (duplicadas, incompletas, opcion ajena, segundos) dan 422", async () => {
    const { b, test: t, desafio } = await escenarioDesafio();
    const ok = respuestas(t, 2);
    const url = `/api/desafios/${desafio.id}/intentos`;
    const casos = [
      { segundos: 1, respuestas: [ok[0], ok[0]] },
      { segundos: 1, respuestas: [ok[0]] },
      {
        segundos: 1,
        respuestas: [{ ...ok[0], opcion_id: ok[1].opcion_id }, ok[1]],
      },
      { segundos: -1, respuestas: ok },
      { segundos: "1", respuestas: ok },
    ];
    for (const body of casos)
      expect((await b.post(url, body)).status).toBe(422);
    // Ninguno consumio el intento.
    expect((await b.post(url, { segundos: 1, respuestas: ok })).status).toBe(
      201,
    );
  });

  test("[ECO-05] farmeo en solitario: un solo elegible no gana ni cobra", async () => {
    const owner = await nuevoUsuario("Owner");
    const m = await crearMateria(owner);
    const g = await crearGrupo(owner, m.id);
    const t = await crearTest(owner, m.id);
    const d = await crearDesafio(owner, g.id, t.id);
    await rendir(owner, d.id, t, 2);
    await owner.saldo();
    const r = await owner.post(`/api/desafios/${d.id}/cerrar`);
    expect(r.body).toMatchObject({
      estado: "cerrado",
      ganador_user_id: null,
      premio_acreditado: false,
    });
    expect(await owner.saldo()).toBe(100);
    const lb = (await owner.get(`/api/grupos/${g.id}/leaderboard`)).body;
    expect(
      lb.every((e: { desafios_ganados: number }) => e.desafios_ganados === 0),
    ).toBe(true);
  });

  test("[ECO-06] autor mas un miembro: un solo elegible, sin premio", async () => {
    const { owner, b, test: t, desafio } = await escenarioDesafio();
    await rendir(owner, desafio.id, t, 2);
    await rendir(b, desafio.id, t, 2);
    await b.saldo();
    const r = await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    expect(r.body.ganador_user_id).toBeNull();
    expect(await b.saldo()).toBe(100);
  });

  test("[ECO-07] autor con mejor puntaje no es elegible; gana el mejor elegible", async () => {
    const { owner, b, c, test: t, desafio } = await escenarioDesafio();
    await rendir(owner, desafio.id, t, 2, 1);
    await rendir(b, desafio.id, t, 1);
    await rendir(c, desafio.id, t, 0);
    await owner.saldo();
    const r = await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    expect(r.body.ganador_user_id).toBe(b.id);
    expect(await owner.saldo()).toBe(100);
    const rk = (await b.get(`/api/desafios/${desafio.id}/ranking`)).body;
    const fila = rk.find((e: { user_id: string }) => e.user_id === owner.id);
    expect(fila.elegible).toBe(false);
  });

  test("[ECO-08] miembro expulsado no puede ganar", async () => {
    const { owner, b, c, test: t, desafio, grupo } = await escenarioDesafio();
    const d = await nuevoUsuario("Dora");
    await unirse(
      d,
      (await owner.get(`/api/grupos/${grupo.id}`)).body.codigo_invitacion,
    );
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    await rendir(d, desafio.id, t, 0);
    await owner.del(`/api/grupos/${grupo.id}/miembros/${b.id}`);
    const r = await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    expect(r.body.ganador_user_id).toBe(c.id);
  });

  test("[ECO-09] rendir concurrente deja un solo intento", async () => {
    const { b, test: t, desafio } = await escenarioDesafio();
    const body = { segundos: 1, respuestas: respuestas(t, 2) };
    const r = await Promise.all(
      Array.from({ length: 6 }, () =>
        b.post(`/api/desafios/${desafio.id}/intentos`, body),
      ),
    );
    const estados = r.map((x) => x.status).sort();
    expect(estados.filter((s) => s === 201)).toHaveLength(1);
    expect(estados.filter((s) => s === 409)).toHaveLength(5);
  });

  test("[ECO-10] generaciones concurrentes no dejan saldo negativo ni doble cobro", async () => {
    const u = await nuevoUsuario("Carrera");
    const m = await crearMateria(u);
    await gastarHasta(u, m.id, 20);
    const r = await Promise.all(
      Array.from({ length: 6 }, () =>
        u.post("/api/ia/tests", {
          materia_id: m.id,
          tema: "x",
          n_preguntas: 1,
        }),
      ),
    );
    const estados = r.map((x) => x.status);
    expect(estados.filter((s) => s === 201)).toHaveLength(1);
    expect(estados.filter((s) => s === 402)).toHaveLength(5);
    expect(await u.saldo()).toBe(0);
  });

  test("[ECO-11] bono inicial concurrente se acredita una sola vez", async () => {
    const u = await nuevoUsuario("Bono");
    const r = await Promise.all(
      Array.from({ length: 6 }, () => u.get("/api/creditos/saldo")),
    );
    for (const x of r) expect(x.status).toBe(200);
    expect(
      (await u.movimientos()).filter((m) => m.motivo === "bono_inicial"),
    ).toHaveLength(1);
    expect(await u.saldo()).toBe(100);
  });
});

test.describe("Fuga de secretos y headers", () => {
  test("[SEC-01] respuestas y errores no incluyen secretos ni stack traces", async () => {
    const u = await nuevoUsuario("Curioso");
    const respuestasApi = [
      await u.get("/api/me"),
      await call("GET", "/openapi.json", {}),
      await call("GET", "/no-existe", {}),
      await u.get("/api/grupos/no-existe"),
      await u.post("/api/grupos", { nombre: "" }),
      await u.post("/api/ia/tests", { materia_id: "x", tema: "__fallar__" }),
      await call("POST", "/api/test/login", { body: { email: "no-es-email" } }),
    ];
    for (const r of respuestasApi) {
      for (const prohibido of [
        TEST_AUTH_SECRET,
        "ANTHROPIC_API_KEY",
        "DATABASE_URL",
        "postgresql",
        "Traceback",
        "sqlalchemy",
        "psycopg",
        'File "/',
      ]) {
        expect(r.text, prohibido).not.toContain(prohibido);
      }
    }
  });

  test("[SEC-02] JSON malformado responde 422 sin detalles internos", async () => {
    const u = await nuevoUsuario("Curioso");
    const res = await fetch(
      `${process.env.E2E_API_URL ?? "http://localhost:8001"}/api/grupos`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${u.token}`,
          "Content-Type": "application/json",
        },
        body: "{no json",
      },
    );
    expect(res.status).toBe(422);
    expect(await res.text()).not.toContain("Traceback");
  });

  test("[SEC-03] CORS no es * y solo refleja el origen permitido", async () => {
    const preflight = async (origin: string) =>
      fetch(`${process.env.E2E_API_URL ?? "http://localhost:8001"}/api/me`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "GET",
        },
      });
    const buena = await preflight("http://localhost:3001");
    expect(buena.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3001",
    );
    const mala = await preflight("https://evil.example");
    expect(mala.headers.get("access-control-allow-origin")).toBeNull();
    const simple = await fetch(
      `${process.env.E2E_API_URL ?? "http://localhost:8001"}/health`,
      {
        headers: { Origin: "https://evil.example" },
      },
    );
    expect(simple.headers.get("access-control-allow-origin")).toBeNull();
  });
});

test.describe("Inyeccion y entradas hostiles", () => {
  const SQL = `Robert'); DROP TABLE grupos;-- "x" %_\\`;
  const XSS = `<img src=x onerror="window.__xss=1">`;

  test("[INY-01] payloads SQL-ish se guardan literales y no rompen", async () => {
    const u = await nuevoUsuario("Hacker");
    const m = await u.post("/api/materias", { nombre: `${SQL} ${unico("m")}` });
    expect(m.status).toBe(201);
    const g = await u.post("/api/grupos", {
      nombre: SQL,
      materia_id: m.body.id,
    });
    expect(g.status).toBe(201);
    expect(g.body.nombre).toBe(SQL);
    const t = await u.post("/api/tests", {
      ...payloadTest(m.body.id),
      titulo: SQL,
    });
    expect(t.status).toBe(201);
    expect((await u.get("/api/grupos")).body).toHaveLength(1);
    const q = await u.get(
      `/api/materias?q=${encodeURIComponent("' OR 1=1 --")}`,
    );
    expect(q.status).toBe(200);
    expect(q.body).toEqual([]);
  });

  test("[INY-02] comodines LIKE en la busqueda de materias no listan todo", async () => {
    const u = await nuevoUsuario("Hacker");
    await crearMateria(u);
    const r = await u.get(`/api/materias?q=${encodeURIComponent("%")}`);
    expect(r.status).toBe(200);
    expect(
      r.body.filter((x: { nombre: string }) => !x.nombre.includes("%")),
    ).toEqual([]);
  });

  test("[INY-03] XSS almacenado en nombres se muestra como texto", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Hacker");
    const m = await crearMateria(u);
    const g = await u.post("/api/grupos", { nombre: XSS, materia_id: m.id });
    await entrar(context, u);
    await page.goto(`/grupos/${g.body.id}`);
    await expect(page.getByRole("heading", { name: XSS })).toBeVisible();
    expect(await page.evaluate(() => "__xss" in window)).toBe(false);
    await page.goto("/grupos");
    await expect(page.getByText(XSS)).toBeVisible();
    expect(await page.evaluate(() => "__xss" in window)).toBe(false);
  });

  test("[INY-04] caracter NUL en textos no provoca 500", async () => {
    const u = await nuevoUsuario("Hacker");
    const m = await crearMateria(u);
    const NUL = "a\u0000b";
    const casos = [
      await u.post("/api/materias", { nombre: NUL }),
      await u.post("/api/grupos", { nombre: NUL, materia_id: m.id }),
      await u.post("/api/grupos/unirse", { codigo: NUL }),
      await u.post("/api/tests", { ...payloadTest(m.id), titulo: NUL }),
      await u.post("/api/semestres", {
        nombre: NUL,
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-06-30",
      }),
      await u.post("/api/eventos", {
        titulo: NUL,
        tipo: "personal",
        fecha_inicio: "2026-03-02T10:00:00",
      }),
    ];
    for (const r of casos) expect(r.status, r.text).toBeLessThan(500);
    const busqueda = await u.get(`/api/materias?q=${encodeURIComponent(NUL)}`);
    expect(busqueda.status).toBeLessThan(500);
  });

  test("[INY-05] textos mas largos que la columna no provocan 500", async () => {
    const u = await nuevoUsuario("Hacker");
    const m = await crearMateria(u);
    const LARGO = "x".repeat(5000);
    const semestre = (
      await u.post("/api/semestres", {
        nombre: "S",
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-06-30",
      })
    ).body;
    const color = (await coloresValidos())[0];
    const casos = [
      await u.post("/api/semestres", {
        nombre: LARGO,
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-06-30",
      }),
      await u.post("/api/cursos", {
        semestre_id: semestre.id,
        nombre: LARGO,
        codigo: LARGO,
        color,
      }),
      await u.post("/api/eventos", {
        titulo: LARGO,
        tipo: "personal",
        fecha_inicio: "2026-03-02T10:00:00",
      }),
      await u.post("/api/tests", { ...payloadTest(m.id), titulo: LARGO }),
      await u.post("/api/grupos", { nombre: LARGO, materia_id: m.id }),
      await u.post("/api/materias", { nombre: LARGO }),
    ];
    for (const r of casos)
      expect(r.status, r.text.slice(0, 200)).toBeLessThan(500);
  });

  test("[INY-06] referencias inexistentes dan error de cliente, no 500", async () => {
    const u = await nuevoUsuario("Hacker");
    const color = (await coloresValidos())[0];
    const casos = [
      await u.post("/api/grupos", { nombre: "x", materia_id: "no-existe" }),
      await u.post("/api/tests", payloadTest("no-existe")),
      await u.post("/api/cursos", {
        semestre_id: "no-existe",
        nombre: "x",
        codigo: "x",
        color,
      }),
      await u.post("/api/eventos", {
        titulo: "x",
        tipo: "personal",
        fecha_inicio: "2026-03-02T10:00:00",
        curso_id: "no-existe",
      }),
      await u.post("/api/ia/resumenes", {
        texto_fuente: "t".repeat(60),
        materia_id: "no-existe",
      }),
    ];
    for (const r of casos) {
      expect(r.status, r.text.slice(0, 200)).toBeGreaterThanOrEqual(400);
      expect(r.status, r.text.slice(0, 200)).toBeLessThan(500);
    }
    expect(await u.saldo()).toBe(100); // el resumen rechazado no cobra
  });

  test("[INY-07] fechas invalidas dan 422 y no 500", async () => {
    const u = await nuevoUsuario("Hacker");
    const r = await u.post("/api/semestres", {
      nombre: "S",
      fecha_inicio: "no-fecha",
      fecha_fin: "2026-06-30",
    });
    expect(r.status).toBe(422);
    const invertido = await u.post("/api/semestres", {
      nombre: "S",
      fecha_inicio: "2026-06-30",
      fecha_fin: "2026-01-01",
    });
    expect(invertido.status).toBeLessThan(500);
    const eventos = await u.get("/api/eventos?desde=x&hasta=y");
    expect(eventos.status).toBe(422);
  });
});

async function coloresValidos(): Promise<string[]> {
  // Fuente: frontend/lib/colors.ts y backend/app/core/colors.py
  const { COLORES_CURSO } = await import("../lib/colors");
  return [...COLORES_CURSO];
}
