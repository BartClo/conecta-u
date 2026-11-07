// Flujos funcionales por area. Cada test crea sus usuarios y datos.
import { expect, test } from "@playwright/test";
import { COLORES_CURSO } from "../lib/colors";
import {
  TEST_COOKIE,
  WEB,
  aceptarDialogos,
  call,
  crearDesafio,
  crearGrupo,
  crearMateria,
  crearTest,
  entrar,
  escenarioDesafio,
  gastarHasta,
  hace,
  nuevoUsuario,
  payloadTest,
  rendir,
  unico,
  unirse,
} from "./helpers";

test.describe("Auth/shell", () => {
  test("[AUTH-01] login de test lleva al dashboard", async ({ page }) => {
    const email = `${unico("login")}@e2e.test`;
    await page.goto("/login");
    await page.getByLabel("Email de prueba").fill(email);
    await page.getByRole("button", { name: /modo de prueba/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Hola,/ })).toContainText(
      email,
    );
  });

  test("[AUTH-02] ruta protegida sin sesion redirige a /login", async ({
    page,
  }) => {
    for (const ruta of [
      "/dashboard",
      "/grupos",
      "/creditos",
      "/ia/resumenes",
    ]) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("[AUTH-03] logout borra la sesion y vuelve a exigir login", async ({
    page,
    context,
  }) => {
    await entrar(context, await nuevoUsuario("Logout"));
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    const cookies = await context.cookies(WEB);
    expect(cookies.find((c) => c.name === TEST_COOKIE)).toBeUndefined();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("[AUTH-04] la raiz redirige a /dashboard con sesion", async ({
    page,
    context,
  }) => {
    await entrar(context, await nuevoUsuario("Raiz"));
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test("[AUTH-05] dashboard con cursos y grupos renderiza sin errores de pagina", async ({
  page,
  context,
}) => {
  const u = await nuevoUsuario("Dash");
  const hoy = new Date();
  const semestre = (
    await u.post("/api/semestres", {
      nombre: "Activo",
      fecha_inicio: `${hoy.getFullYear()}-01-01`,
      fecha_fin: `${hoy.getFullYear()}-12-31`,
    })
  ).body;
  await u.post("/api/cursos", {
    semestre_id: semestre.id,
    nombre: "Física",
    codigo: "FIS1",
    color: COLORES_CURSO[0],
  });
  await crearGrupo(u, (await crearMateria(u)).id);
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await entrar(context, u);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(errores).toEqual([]);
});

test.describe("Cursos y calendario", () => {
  test("[CUR-01] CRUD de semestre y curso por la UI", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Cursos");
    await entrar(context, u);
    aceptarDialogos(page);
    await page.goto("/cursos");
    await expect(page.getByText("Crea tu primer semestre")).toBeVisible();

    await page.getByRole("button", { name: "+ Nuevo semestre" }).click();
    await page.getByLabel("Nombre").fill("2026-2");
    await page.getByLabel("Fecha de inicio").fill("2026-08-01");
    await page.getByLabel("Fecha de fin").fill("2026-12-31");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator("select")).toContainText("2026-2");

    await page.getByRole("button", { name: "Nuevo curso" }).click();
    await page.getByLabel("Nombre").fill("Cálculo");
    await page.getByLabel("Código").fill("MAT101");
    await page.getByLabel("Profesor").fill("Euler");
    await page.getByRole("button", { name: "Guardar" }).click();
    await page.getByRole("link", { name: /Cálculo/ }).click();
    await expect(page.getByRole("heading", { name: "Cálculo" })).toBeVisible();

    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Nombre").fill("Cálculo II");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(
      page.getByRole("heading", { name: "Cálculo II" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Borrar" }).click();
    await expect(page).toHaveURL(/\/cursos$/);
    await expect(page.getByRole("link", { name: /Cálculo/ })).toHaveCount(0);
    const semestres = (await u.get("/api/semestres")).body;
    const cursos = await u.get(`/api/cursos?semestre_id=${semestres[0].id}`);
    expect(cursos.body).toEqual([]);
  });

  test("[CUR-02] actualizar y borrar semestre por API", async () => {
    const u = await nuevoUsuario("Sem");
    const s = (
      await u.post("/api/semestres", {
        nombre: "A",
        fecha_inicio: "2026-01-01",
        fecha_fin: "2026-06-30",
      })
    ).body;
    const put = await u.put(`/api/semestres/${s.id}`, {
      nombre: "B",
      fecha_inicio: "2026-01-01",
      fecha_fin: "2026-07-31",
    });
    expect(put.body.nombre).toBe("B");
    expect((await u.del(`/api/semestres/${s.id}`)).status).toBe(204);
    expect((await u.get(`/api/semestres/${s.id}`)).status).toBe(404);
  });

  test("[CAL-01] crear, editar y borrar evento; navegar de mes", async ({
    page,
    context,
  }) => {
    await entrar(context, await nuevoUsuario("Cal"));
    aceptarDialogos(page);
    await page.goto("/calendario");
    const titulo = page.locator("h1");
    const mes = await titulo.textContent();

    // El dia 15 existe siempre y aparece una sola vez en la grilla.
    await page.getByRole("button", { name: "15", exact: true }).click();
    await page.getByLabel("Título").fill("Certamen");
    await page.getByRole("button", { name: "Guardar" }).click();
    const evento = page.getByRole("button", { name: "Certamen" });
    await expect(evento).toBeVisible();

    await page.getByRole("button", { name: "mes siguiente" }).click();
    await expect(titulo).not.toHaveText(mes!);
    await expect(evento).toHaveCount(0);
    await page.getByRole("button", { name: "mes anterior" }).click();
    await expect(titulo).toHaveText(mes!);
    await expect(evento).toBeVisible();

    await evento.click();
    await page.getByLabel("Título").fill("Certamen 2");
    await page.getByRole("button", { name: "Guardar" }).click();
    const editado = page.getByRole("button", { name: "Certamen 2" });
    await expect(editado).toBeVisible();

    await editado.click();
    await page.getByRole("button", { name: "Borrar evento" }).click();
    await expect(editado).toHaveCount(0);
  });

  test("[CAL-02] evento recurrente se expande semanalmente", async () => {
    const u = await nuevoUsuario("Rec");
    const creado = await u.post("/api/eventos", {
      titulo: "Ayudantía",
      tipo: "personal",
      fecha_inicio: "2026-03-02T10:00:00",
      recurrencia_dia_semana: 0,
      recurrencia_hasta: "2026-03-23",
    });
    expect(creado.status).toBe(201);
    const lista = await u.get("/api/eventos?desde=2026-03-01&hasta=2026-03-31");
    expect(lista.body.map((o: { titulo: string }) => o.titulo)).toEqual(
      Array(4).fill("Ayudantía"),
    );
  });
});

test.describe("Grupos", () => {
  test("[GRU-01] crear grupo con materia nueva por la UI", async ({
    page,
    context,
  }) => {
    await entrar(context, await nuevoUsuario("GrupoUI"));
    const materia = unico("Materia Nueva");
    await page.goto("/grupos");
    await page.getByRole("button", { name: "Crear grupo" }).click();
    await page.getByLabel("Nombre").fill("Mi grupo");
    await page.getByRole("button", { name: "Seleccionar materia" }).click();
    await page.getByPlaceholder("Buscar materia…").fill(materia);
    await page.getByRole("option", { name: `Crear materia` }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Mi grupo")).toBeVisible();
  });

  test("[GRU-02] crear grupo con materia existente por autocompletado", async ({
    page,
    context,
  }) => {
    const otro = await nuevoUsuario("Otro");
    const materia = await crearMateria(otro);
    await entrar(context, await nuevoUsuario("GrupoUI"));
    await page.goto("/grupos");
    await page.getByRole("button", { name: "Crear grupo" }).click();
    await page.getByLabel("Nombre").fill("Con existente");
    await page.getByRole("button", { name: "Seleccionar materia" }).click();
    await page.getByPlaceholder("Buscar materia…").fill(materia.nombre);
    await page.getByRole("option", { name: materia.nombre }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await page.getByText("Con existente").click();
    await expect(page.getByText(materia.nombre)).toBeVisible();
  });

  test("[GRU-03] unirse por codigo, codigo invalido y re-unirse", async ({
    page,
    context,
  }) => {
    const owner = await nuevoUsuario("Owner");
    const grupo = await crearGrupo(owner, (await crearMateria(owner)).id);
    const u = await nuevoUsuario("Miembro");
    await entrar(context, u);
    await page.goto("/grupos");
    await page.getByRole("button", { name: "Unirse con código" }).click();

    await page.getByLabel("Código").fill("NOEXISTE");
    await page.getByRole("button", { name: "Unirse", exact: true }).click();
    await expect(page.getByText("Código inválido")).toBeVisible();

    await page.getByLabel("Código").fill(grupo.codigo_invitacion);
    await page.getByRole("button", { name: "Unirse", exact: true }).click();
    await expect(page.getByText(grupo.nombre)).toBeVisible();

    await page.getByRole("button", { name: "Unirse con código" }).click();
    await page.getByLabel("Código").fill(grupo.codigo_invitacion);
    await page.getByRole("button", { name: "Unirse", exact: true }).click();
    await expect(page.getByText("Ya eres miembro")).toBeVisible();

    const api = await u.post("/api/grupos/unirse", { codigo: "NOEXISTE" });
    expect(api.status).toBe(404);
  });

  test("[GRU-04] owner edita, regenera codigo, expulsa y borra", async ({
    page,
    context,
  }) => {
    const owner = await nuevoUsuario("Owner");
    const grupo = await crearGrupo(owner, (await crearMateria(owner)).id);
    const m = await nuevoUsuario("Expulsado");
    await unirse(m, grupo.codigo_invitacion);
    await entrar(context, owner);
    aceptarDialogos(page);
    await page.goto(`/grupos/${grupo.id}`);

    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Nombre").fill("Renombrado");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(
      page.getByRole("heading", { name: "Renombrado" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Regenerar código" }).click();
    await expect(page.getByText(grupo.codigo_invitacion)).toHaveCount(0);
    const nuevo = await owner.get(`/api/grupos/${grupo.id}`);
    await expect(page.getByText(nuevo.body.codigo_invitacion)).toBeVisible();

    await page.getByRole("button", { name: "Expulsar" }).click();
    await expect(page.getByText(m.name)).toHaveCount(0);
    await expect(page.getByText("1 miembro", { exact: true })).toBeVisible();
    expect((await m.get(`/api/grupos/${grupo.id}`)).status).toBe(404);

    await page.getByRole("button", { name: "Borrar grupo" }).click();
    await expect(page).toHaveURL(/\/grupos$/);
    await expect(page.getByText("Renombrado")).toHaveCount(0);
    expect((await owner.get(`/api/grupos/${grupo.id}`)).status).toBe(404);
  });

  test("[GRU-05] miembro ve detalle y sale del grupo", async ({
    page,
    context,
  }) => {
    const owner = await nuevoUsuario("Owner");
    const grupo = await crearGrupo(owner, (await crearMateria(owner)).id);
    const m = await nuevoUsuario("Sale");
    await unirse(m, grupo.codigo_invitacion);
    await entrar(context, m);
    aceptarDialogos(page);
    await page.goto(`/grupos/${grupo.id}`);
    await expect(page.getByText("2 miembros")).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Regenerar código" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Salir del grupo" }).click();
    await expect(page).toHaveURL(/\/grupos$/);
    expect((await m.get("/api/grupos")).body).toEqual([]);
  });

  test("[GRU-06] no miembro no ve el grupo (pagina y API)", async ({
    page,
    context,
  }) => {
    const owner = await nuevoUsuario("Owner");
    const grupo = await crearGrupo(owner, (await crearMateria(owner)).id);
    const ajeno = await nuevoUsuario("Ajeno");
    expect((await ajeno.get(`/api/grupos/${grupo.id}`)).status).toBe(404);
    await entrar(context, ajeno);
    await page.goto(`/grupos/${grupo.id}`);
    await expect(page.getByText(grupo.codigo_invitacion)).toHaveCount(0);
    await expect(page.getByText(grupo.nombre)).toHaveCount(0);
    await page.goto(`/grupos/${grupo.id}/desafios`);
    await expect(page.getByText(grupo.codigo_invitacion)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Nuevo desafío" }),
    ).toHaveCount(0);
  });
});

test.describe("Tests", () => {
  test("[TES-01] crear por la UI con validaciones, editar y borrar", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Autor");
    const materia = await crearMateria(u);
    await entrar(context, u);
    aceptarDialogos(page);
    await page.goto(`/materias/${materia.id}/tests/nuevo`);

    await page.getByRole("button", { name: "Crear test" }).click();
    await expect(
      page.getByText("El título no puede estar vacío"),
    ).toBeVisible();
    await expect(page.getByText("Agrega al menos una pregunta")).toBeVisible();

    await page.getByLabel("Título").fill("Derivadas");
    await page.getByRole("button", { name: "Agregar pregunta" }).click();
    await page.getByLabel("Enunciado de la pregunta 1").fill("2+2");
    await page
      .getByLabel("Opción 1 de la pregunta 1", { exact: true })
      .fill("4");
    await page
      .getByLabel("Opción 2 de la pregunta 1", { exact: true })
      .fill("5");
    await page.getByRole("button", { name: "Crear test" }).click();
    await expect(page.getByText("Marca una opción correcta")).toBeVisible();

    await page
      .getByLabel("Marcar la opción 1 de la pregunta 1 como correcta")
      .check();
    await page.getByRole("button", { name: "Crear test" }).click();
    await expect(
      page.getByRole("heading", { name: "Derivadas" }),
    ).toBeVisible();
    await expect(page.getByText("4 ✓ Correcta")).toBeVisible();

    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Título").fill("Derivadas 2");
    await page.getByRole("button", { name: /Guardar/ }).click();
    await expect(
      page.getByRole("heading", { name: "Derivadas 2" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Borrar" }).click();
    await expect(page).toHaveURL(new RegExp(`/materias/${materia.id}/tests$`));
    await expect(page.getByText("Todavía no hay tests")).toBeVisible();
  });

  test("[TES-02] API valida ≥1 pregunta, ≥2 opciones, exactamente 1 correcta", async () => {
    const u = await nuevoUsuario("Autor");
    const materia = await crearMateria(u);
    const base = payloadTest(materia.id);
    const op = (texto: string, es_correcta: boolean) => ({
      texto,
      es_correcta,
    });
    const invalidos = [
      { ...base, preguntas: [] },
      {
        ...base,
        preguntas: [{ enunciado: "x", opciones: [op("a", true)] }],
      },
      {
        ...base,
        preguntas: [
          { enunciado: "x", opciones: [op("a", false), op("b", false)] },
        ],
      },
      {
        ...base,
        preguntas: [
          { enunciado: "x", opciones: [op("a", true), op("b", true)] },
        ],
      },
    ];
    for (const body of invalidos) {
      expect((await u.post("/api/tests", body)).status).toBe(422);
    }
    expect((await u.get(`/api/tests?materia_id=${materia.id}`)).body).toEqual(
      [],
    );
  });

  test("[TES-03] editar reemplaza las preguntas; test ajeno da 403", async () => {
    const autor = await nuevoUsuario("Autor");
    const materia = await crearMateria(autor);
    const t = await crearTest(autor, materia.id);
    const nuevo = payloadTest(materia.id, "Editado");
    nuevo.preguntas = nuevo.preguntas.slice(0, 1);
    const put = await autor.put(`/api/tests/${t.id}`, nuevo);
    expect(put.status).toBe(200);
    expect(put.body.preguntas).toHaveLength(1);
    expect(put.body.preguntas[0].id).not.toBe(t.preguntas[0].id);

    const ajeno = await nuevoUsuario("Ajeno");
    expect((await ajeno.put(`/api/tests/${t.id}`, nuevo)).status).toBe(403);
    expect((await ajeno.del(`/api/tests/${t.id}`)).status).toBe(403);
  });

  test("[TES-04] test con desafios no se edita ni borra (409), con mensaje en UI", async ({
    page,
    context,
  }) => {
    const { owner, test: t, materia } = await escenarioDesafio();
    expect(
      (await owner.put(`/api/tests/${t.id}`, payloadTest(materia.id))).status,
    ).toBe(409);
    expect((await owner.del(`/api/tests/${t.id}`)).status).toBe(409);
    await entrar(context, owner);
    aceptarDialogos(page);
    await page.goto(`/materias/${materia.id}/tests/${t.id}`);
    await page.getByRole("button", { name: "Borrar" }).click();
    await expect(page.getByText("ya tiene desafíos")).toBeVisible();
  });
});

test.describe("Desafios y rendir", () => {
  test("[DES-01] crear desafio y rendir por la UI, una pregunta a la vez", async ({
    page,
    context,
  }) => {
    const owner = await nuevoUsuario("Owner");
    const materia = await crearMateria(owner);
    const grupo = await crearGrupo(owner, materia.id);
    const t = await crearTest(owner, materia.id);
    const m = await nuevoUsuario("Rinde");
    await unirse(m, grupo.codigo_invitacion);
    await entrar(context, m);
    await page.goto(`/grupos/${grupo.id}/desafios`);
    await expect(page.getByText("Aún no hay desafíos")).toBeVisible();

    await page.getByRole("button", { name: "Nuevo desafío" }).click();
    await page.getByLabel("Test").selectOption(t.id);
    await page.getByRole("button", { name: "Crear", exact: true }).click();
    await page.getByRole("link", { name: "Rendir" }).click();

    await expect(page.getByText("Pregunta 1 de 2")).toBeVisible();
    await expect(page.getByLabel("Tiempo transcurrido")).toBeVisible();
    await expect(page.getByText("Pregunta 2", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeVisible();
    await page.getByLabel("Correcta 1", { exact: true }).check();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Pregunta 2 de 2")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Finalizar" }),
    ).toBeDisabled();
    await page.getByLabel("Incorrecta 2", { exact: true }).check();
    await page.getByRole("button", { name: "Finalizar" }).click();
    await expect(page.getByText("Tu puntaje: 1 / 2")).toBeVisible();
    await expect(page.getByText("Resultados del desafío")).toBeVisible();

    // Volver a entrar muestra el resultado, no el formulario.
    await page.reload();
    await expect(page.getByText("Tu puntaje: 1 / 2")).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizar" })).toHaveCount(
      0,
    );
  });

  test("[DES-02] re-rendir por API da 409 ya_rindio", async () => {
    const { b, test: t, desafio } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 1);
    const otra = await b.post(`/api/desafios/${desafio.id}/intentos`, {
      segundos: 1,
      respuestas: [],
    });
    expect(otra.status).toBe(409);
    expect(otra.body.detail).toBe("ya_rindio");
    expect((await b.get(`/api/desafios/${desafio.id}/rendir`)).status).toBe(
      409,
    );
  });

  test("[DES-03] rendir desafio cerrado queda bloqueado (API y UI)", async ({
    page,
    context,
  }) => {
    const { owner, b, c, test: t, desafio, grupo } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 1);
    expect(
      (await owner.post(`/api/desafios/${desafio.id}/cerrar`)).status,
    ).toBe(200);
    expect((await c.get(`/api/desafios/${desafio.id}/rendir`)).status).toBe(
      409,
    );
    await entrar(context, c);
    await page.goto(`/grupos/${grupo.id}/desafios/${desafio.id}`);
    await expect(page.getByText("no está disponible")).toBeVisible();
  });

  test("[DES-04] fuera de ventana (antes de inicio, despues de fin) queda bloqueado", async () => {
    const { owner, b, test: t, grupo } = await escenarioDesafio();
    const futuro = await crearDesafio(owner, grupo.id, t.id, {
      fecha_inicio: hace(-2),
    });
    const vencido = await crearDesafio(owner, grupo.id, t.id, {
      fecha_inicio: hace(3),
      fecha_fin: hace(1),
    });
    for (const d of [futuro, vencido]) {
      expect((await b.get(`/api/desafios/${d.id}/rendir`)).status).toBe(409);
      const r = await b.post(`/api/desafios/${d.id}/intentos`, {
        segundos: 1,
        respuestas: [],
      });
      expect(r.status).toBe(409);
      expect(r.body.detail).toBe("desafio_no_disponible");
    }
  });

  test("[DES-05] ver resultados tras rendir; antes da 403", async () => {
    const { b, c, test: t, desafio } = await escenarioDesafio();
    expect((await b.get(`/api/desafios/${desafio.id}/resultados`)).status).toBe(
      403,
    );
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    const res = await b.get(`/api/desafios/${desafio.id}/resultados`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("[DES-06] test de otra materia al crear desafio da 409", async () => {
    const owner = await nuevoUsuario("Owner");
    const grupo = await crearGrupo(owner, (await crearMateria(owner)).id);
    const otro = await crearTest(owner, (await crearMateria(owner)).id);
    const r = await owner.post(`/api/grupos/${grupo.id}/desafios`, {
      test_id: otro.id,
    });
    expect(r.status).toBe(409);
  });
});

test.describe("Ranking", () => {
  test("[RAN-01] cerrar por la UI determina ganador y acredita premio", async ({
    page,
    context,
  }) => {
    const { owner, b, c, test: t, desafio, grupo } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    await b.saldo();
    await entrar(context, owner);
    aceptarDialogos(page);
    await page.goto(`/grupos/${grupo.id}/desafios/${desafio.id}`);
    await page.getByRole("button", { name: "Cerrar desafío" }).click();
    await expect(page.getByText(`Ganador: ${b.name}`)).toBeVisible();
    await expect(page.getByText(`+15 créditos para ${b.name}`)).toBeVisible();
    expect(await b.saldo()).toBe(115);
    expect(await c.saldo()).toBe(100);
  });

  test("[RAN-02] leaderboard del grupo refleja victorias (API y pagina)", async ({
    page,
    context,
  }) => {
    const { owner, b, c, test: t, desafio, grupo } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    const lb = (await c.get(`/api/grupos/${grupo.id}/leaderboard`)).body;
    expect(lb[0]).toMatchObject({
      user_id: b.id,
      desafios_ganados: 1,
      suma_puntajes: 2,
      posicion: 1,
    });
    await entrar(context, c);
    await page.goto(`/grupos/${grupo.id}`);
    await expect(page.getByLabel("Podio")).toContainText(b.name);
    await expect(page.getByLabel("Podio")).toContainText("1 ganados");
  });

  test("[RAN-03] ranking por materia, por pagina y sin emails", async ({
    page,
    context,
  }) => {
    const { owner, b, c, test: t, desafio, materia } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    const r = await c.get(`/api/materias/${materia.id}/ranking`);
    expect(r.body[0].user_id).toBe(b.id);
    expect(r.text).not.toContain("@e2e.test");
    await entrar(context, c);
    await page.goto("/ranking");
    await page.getByLabel("Materia").selectOption(materia.id);
    await expect(page.getByLabel("Podio")).toContainText(b.name);
  });

  test("[RAN-04] cerrar dos veces es idempotente", async () => {
    const { owner, b, c, test: t, desafio } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    const uno = await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    const dos = await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    expect(dos.status).toBe(200);
    expect(dos.body).toEqual(uno.body);
    expect(await b.saldo()).toBe(115);
  });

  test("[RAN-05] tras fecha_fin cualquier miembro cierra; antes solo owner", async () => {
    const { owner, b, c, test: t, grupo } = await escenarioDesafio();
    const vencido = await crearDesafio(owner, grupo.id, t.id, {
      fecha_inicio: hace(3),
      fecha_fin: hace(1),
    });
    const r = await c.post(`/api/desafios/${vencido.id}/cerrar`);
    expect(r.status).toBe(200);
    expect(r.body.estado).toBe("cerrado");
    const abierto = await crearDesafio(owner, grupo.id, t.id);
    expect((await b.post(`/api/desafios/${abierto.id}/cerrar`)).status).toBe(
      403,
    );
  });

  test("[RAN-06] con desafio abierto el ranking es solo para quien rindio", async () => {
    const { b, c, test: t, desafio } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 1);
    expect((await b.get(`/api/desafios/${desafio.id}/ranking`)).status).toBe(
      200,
    );
    const r = await c.get(`/api/desafios/${desafio.id}/ranking`);
    expect(r.status).toBe(403);
    expect(r.body.detail).toBe("debes_rendir_primero");
  });
});

test.describe("Creditos", () => {
  test("[CRE-01] bono inicial visible en nav y en /creditos", async ({
    page,
    context,
  }) => {
    await entrar(context, await nuevoUsuario("Bono"));
    await page.goto("/creditos");
    await expect(
      page.getByRole("paragraph").filter({ hasText: /^100$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Créditos" }),
    ).toContainText("100");
    await expect(page.getByText("Empezaste con tu bono")).toBeVisible();
  });

  test("[CRE-02] historial con motivos legibles tras ganar y gastar", async ({
    page,
    context,
  }) => {
    const { owner, b, c, test: t, desafio, materia } = await escenarioDesafio();
    await rendir(b, desafio.id, t, 2);
    await rendir(c, desafio.id, t, 1);
    await b.saldo();
    await owner.post(`/api/desafios/${desafio.id}/cerrar`);
    await b.post("/api/ia/tests", {
      materia_id: materia.id,
      tema: "x",
      n_preguntas: 1,
    });
    await b.post("/api/ia/resumenes", { texto_fuente: "t".repeat(60) });
    await entrar(context, b);
    await page.goto("/creditos");
    await expect(
      page.getByRole("paragraph").filter({ hasText: /^85$/ }),
    ).toBeVisible();
    for (const motivo of [
      "Bono de bienvenida",
      "Ganaste un desafío",
      "Generaste un test con IA",
      "Generaste un resumen con IA",
    ]) {
      await expect(page.getByText(motivo)).toBeVisible();
    }
    await expect(page.getByText("gano_desafio")).toHaveCount(0);
  });

  test("[CRE-03] paginacion de movimientos", async () => {
    const u = await nuevoUsuario("Pag");
    await u.saldo();
    const r = await u.get("/api/creditos/movimientos?limit=1&offset=0");
    expect(r.body).toMatchObject({ limit: 1, offset: 0, total: 1 });
    expect((await u.get("/api/creditos/movimientos?limit=1000")).status).toBe(
      422,
    );
  });
});

test.describe("IA", () => {
  test("[IA-01] generar test por la UI cobra, navega y refresca el saldo del nav", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Ia");
    const materia = await crearMateria(u);
    await entrar(context, u);
    await page.goto(`/materias/${materia.id}/tests/nuevo-ia`);
    const nav = page.getByRole("listitem").filter({ hasText: "Créditos" });
    await expect(nav).toContainText("100");
    await page.getByLabel("Tema o temario").fill("Integrales");
    await page.getByLabel("Cantidad de preguntas").fill("3");
    await page.getByRole("button", { name: "Generar test" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/materias/${materia.id}/tests/[0-9a-f-]{36}$`),
    );
    await expect(
      page.getByRole("heading", { name: "Test: Integrales" }),
    ).toBeVisible();
    // Query key ["creditos","saldo"]: el nav baja sin recargar.
    await expect(nav).toContainText("80");
    expect(await u.saldo()).toBe(80);
  });

  test("[IA-02] generar resumen por la UI cobra y muestra el resumen", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Res");
    await entrar(context, u);
    await page.goto("/ia/resumenes/nuevo");
    const nav = page.getByRole("listitem").filter({ hasText: "Créditos" });
    await expect(nav).toContainText("100");
    await page.getByLabel("Texto a resumir").fill("corto");
    await page.getByRole("button", { name: "Generar resumen" }).click();
    await expect(page.getByText("al menos 50 caracteres")).toBeVisible();

    await page.getByLabel("Título (opcional)").fill("Mi resumen");
    await page.getByLabel("Texto a resumir").fill("contenido ".repeat(10));
    await page.getByRole("button", { name: "Generar resumen" }).click();
    await expect(
      page.getByRole("heading", { name: "Mi resumen" }),
    ).toBeVisible();
    await expect(page.getByText(/^Resumen: contenido/)).toBeVisible();
    await expect(nav).toContainText("90");
    await page.goto("/ia/resumenes");
    await expect(page.getByText("Mi resumen")).toBeVisible();
  });

  test("[IA-03] saldo insuficiente: boton bloqueado y API 402 sin cobro ni test", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Pobre");
    const materia = await crearMateria(u);
    await gastarHasta(u, materia.id, 0);
    const nTests = (await u.get(`/api/tests?materia_id=${materia.id}`)).body
      .length;
    const nMov = (await u.movimientos()).length;

    const r = await u.post("/api/ia/tests", {
      materia_id: materia.id,
      tema: "x",
      n_preguntas: 1,
    });
    expect(r.status).toBe(402);
    expect(
      (await u.post("/api/ia/resumenes", { texto_fuente: "t".repeat(60) }))
        .status,
    ).toBe(402);
    expect(await u.saldo()).toBe(0);
    expect((await u.movimientos()).length).toBe(nMov);
    expect(
      (await u.get(`/api/tests?materia_id=${materia.id}`)).body,
    ).toHaveLength(nTests);
    expect((await u.get("/api/ia/resumenes")).body).toEqual([]);

    await entrar(context, u);
    await page.goto(`/materias/${materia.id}/tests/nuevo-ia`);
    await expect(
      page.getByText("No tienes créditos suficientes"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generar test" }),
    ).toBeDisabled();
  });

  test("[IA-04] saldo gastado en otra pestana: 402 en UI y saldo refrescado", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Stale");
    const materia = await crearMateria(u);
    await gastarHasta(u, materia.id, 20);
    await entrar(context, u);
    await page.goto(`/materias/${materia.id}/tests/nuevo-ia`);
    const nav = page.getByRole("listitem").filter({ hasText: "Créditos" });
    await expect(nav).toContainText("20");
    await u.post("/api/ia/tests", {
      materia_id: materia.id,
      tema: "x",
      n_preguntas: 1,
    });
    await page.getByLabel("Tema o temario").fill("Otro");
    await page.getByRole("button", { name: "Generar test" }).click();
    await expect(
      page.getByText("No tienes créditos suficientes para generar este test"),
    ).toBeVisible();
    await expect(nav).toContainText("0");
  });

  test("[IA-05] error del proveedor: mensaje y sin cobro", async ({
    page,
    context,
  }) => {
    const u = await nuevoUsuario("Falla");
    const materia = await crearMateria(u);
    await entrar(context, u);
    await page.goto(`/materias/${materia.id}/tests/nuevo-ia`);
    await page.getByLabel("Tema o temario").fill("x __fallar__");
    await page.getByRole("button", { name: "Generar test" }).click();
    await expect(page.getByText("No se te cobraron créditos")).toBeVisible();
    expect(await u.saldo()).toBe(100);
    expect((await u.movimientos()).map((m) => m.motivo)).toEqual([
      "bono_inicial",
    ]);
    expect((await u.get(`/api/tests?materia_id=${materia.id}`)).body).toEqual(
      [],
    );

    const r = await u.post("/api/ia/resumenes", {
      texto_fuente: `__fallar__ ${"t".repeat(60)}`,
    });
    expect(r.status).toBe(502);
    expect(await u.saldo()).toBe(100);
  });

  test("[IA-06] materia inexistente da 404 sin cobro", async () => {
    const u = await nuevoUsuario("Sin");
    const r = await u.post("/api/ia/tests", {
      materia_id: "no-existe",
      tema: "x",
      n_preguntas: 1,
    });
    expect(r.status).toBe(404);
    expect(await u.saldo()).toBe(100);
  });
});

test("[API-01] health responde sin autenticar", async () => {
  expect((await call("GET", "/health", {})).body).toEqual({ status: "ok" });
});
