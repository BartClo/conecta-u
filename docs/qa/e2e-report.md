# Reporte de QA e2e y hardening (Fase E)

Corrida final: 2026-11-07, `scripts/e2e.sh` sobre `docker-compose.e2e.yml` (perfil `qa`), Chromium, 4 workers. Sin Supabase, sin red externa, sin clave LLM (`LLM_PROVIDER=fake`).

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Casos Playwright | 88 (41 funcionales, 47 de seguridad) |
| Resultado final | 88 PASS, 0 FAIL |
| Bugs de producción encontrados | 3 |
| Bugs de producción arreglados | 3 |
| Bugs de tooling arreglados | 1 (`scripts/e2e.sh` en Git Bash) |
| Riesgos residuales | 9 (3 medios, 6 bajos), ninguno alto |

La primera corrida dio 8 FAIL: 3 bugs reales de producción (F1 a F3) y 5 errores de la propia suite (GUA-01, GUA-05, GUA-06, TES-01, DES-01: selector ambiguo, botón con otra etiqueta, `/api/test` coincidía con `/api/tests`, `$?` mal escapado en el shell). Esos 5 se corrigieron en el test sin relajar lo que verifican. No hubo fallos de IDOR, fuga de `es_correcta`, integridad económica ni bypass del modo test.

Las guardas también corren contra servicios reales en modo normal: `backend-supabase` (`AUTH_MODE=supabase`, `APP_ENV=production`) y `web-normal` (build sin modo test, con `NEXT_PUBLIC_AUTH_MODE=test` en el env de runtime a propósito). Los tests unitarios de guardas están en `backend/tests/core/test_auth_mode.py` y `frontend/tests/test-auth-mode.test.tsx`.

## Resultados por caso

La evidencia es la aserción del propio test (`frontend/e2e/`, buscar por ID) y su duración en la corrida final.

| ID | Área | Caso | Tipo | Resultado | Evidencia |
|---|---|---|---|---|---|
| AUTH-01 | Auth/shell | login de test lleva al dashboard | funcional | PASS | 8.9s |
| AUTH-02 | Auth/shell | ruta protegida sin sesion redirige a /login | funcional | PASS | 1.4s |
| AUTH-03 | Auth/shell | logout borra la sesion y vuelve a exigir login | funcional | PASS | 2.8s |
| AUTH-04 | Auth/shell | la raiz redirige a /dashboard con sesion | funcional | PASS | 1.8s |
| AUTH-05 | Auth/shell | dashboard con cursos y grupos renderiza sin errores de pagina | funcional | PASS | 3.1s |
| API-01 | API | health responde sin autenticar | funcional | PASS | 0.0s |
| CUR-01 | Cursos | CRUD de semestre y curso por la UI | funcional | PASS | 8.2s |
| CUR-02 | Cursos | actualizar y borrar semestre por API | funcional | PASS | 0.3s |
| CAL-01 | Calendario | crear, editar y borrar evento; navegar de mes | funcional | PASS | 7.7s |
| CAL-02 | Calendario | evento recurrente se expande semanalmente | funcional | PASS | 0.1s |
| GRU-01 | Grupos | crear grupo con materia nueva por la UI | funcional | PASS | 6.6s |
| GRU-02 | Grupos | crear grupo con materia existente por autocompletado | funcional | PASS | 6.7s |
| GRU-03 | Grupos | unirse por codigo, codigo invalido y re-unirse | funcional | PASS | 2.4s |
| GRU-04 | Grupos | owner edita, regenera codigo, expulsa y borra | funcional | PASS | 3.2s; FAIL inicial, ver F3 |
| GRU-05 | Grupos | miembro ve detalle y sale del grupo | funcional | PASS | 2.0s |
| GRU-06 | Grupos | no miembro no ve el grupo (pagina y API) | funcional | PASS | 1.8s |
| TES-01 | Tests | crear por la UI con validaciones, editar y borrar | funcional | PASS | 7.4s |
| TES-02 | Tests | API valida ≥1 pregunta, ≥2 opciones, exactamente 1 correcta | funcional | PASS | 0.2s |
| TES-03 | Tests | editar reemplaza las preguntas; test ajeno da 403 | funcional | PASS | 0.3s |
| TES-04 | Tests | test con desafios no se edita ni borra (409), con mensaje en UI | funcional | PASS | 1.7s |
| DES-01 | Desafíos | crear desafio y rendir por la UI, una pregunta a la vez | funcional | PASS | 9.5s |
| DES-02 | Desafíos | re-rendir por API da 409 ya_rindio | funcional | PASS | 1.5s |
| DES-03 | Desafíos | rendir desafio cerrado queda bloqueado (API y UI) | funcional | PASS | 5.5s |
| DES-04 | Desafíos | fuera de ventana (antes de inicio, despues de fin) queda bloqueado | funcional | PASS | 4.5s |
| DES-05 | Desafíos | ver resultados tras rendir; antes da 403 | funcional | PASS | 0.6s |
| DES-06 | Desafíos | test de otra materia al crear desafio da 409 | funcional | PASS | 0.2s |
| RAN-01 | Ranking | cerrar por la UI determina ganador y acredita premio | funcional | PASS | 1.1s |
| RAN-02 | Ranking | leaderboard del grupo refleja victorias (API y pagina) | funcional | PASS | 1.4s |
| RAN-03 | Ranking | ranking por materia, por pagina y sin emails | funcional | PASS | 2.2s |
| RAN-04 | Ranking | cerrar dos veces es idempotente | funcional | PASS | 1.5s |
| RAN-05 | Ranking | tras fecha_fin cualquier miembro cierra; antes solo owner | funcional | PASS | 1.3s |
| RAN-06 | Ranking | con desafio abierto el ranking es solo para quien rindio | funcional | PASS | 0.4s |
| CRE-01 | Créditos | bono inicial visible en nav y en /creditos | funcional | PASS | 1.3s |
| CRE-02 | Créditos | historial con motivos legibles tras ganar y gastar | funcional | PASS | 2.7s |
| CRE-03 | Créditos | paginacion de movimientos | funcional | PASS | 0.1s |
| IA-01 | IA | generar test por la UI cobra, navega y refresca el saldo del nav | funcional | PASS | 2.7s |
| IA-02 | IA | generar resumen por la UI cobra y muestra el resumen | funcional | PASS | 3.0s |
| IA-03 | IA | saldo insuficiente: boton bloqueado y API 402 sin cobro ni test | funcional | PASS | 1.5s |
| IA-04 | IA | saldo gastado en otra pestana: 402 en UI y saldo refrescado | funcional | PASS | 1.9s |
| IA-05 | IA | error del proveedor: mensaje y sin cobro | funcional | PASS | 0.8s |
| IA-06 | IA | materia inexistente da 404 sin cobro | funcional | PASS | 0.1s |
| IDOR-01 | IDOR/BOLA | grupo ajeno: GET/PUT/DELETE, miembros, leaderboard y codigo | seguridad | PASS | 0.5s |
| IDOR-02 | IDOR/BOLA | test ajeno: PUT/DELETE 403 y GET sin es_correcta | seguridad | PASS | 0.2s |
| IDOR-03 | IDOR/BOLA | desafio e intento de grupo ajeno dan 404 | seguridad | PASS | 0.6s |
| IDOR-04 | IDOR/BOLA | semestre, curso y evento ajenos dan 404 | seguridad | PASS | 0.5s |
| IDOR-05 | IDOR/BOLA | colgar recursos propios de padres ajenos se rechaza | seguridad | PASS | 0.3s |
| IDOR-06 | IDOR/BOLA | resumen ajeno da 404 y no aparece en el listado | seguridad | PASS | 0.1s |
| IDOR-07 | IDOR/BOLA | la pagina de desafio ajeno no muestra datos (ni titulo ni preguntas) | seguridad | PASS | 0.6s |
| IDOR-08 | IDOR/BOLA | expulsado pierde acceso y el codigo viejo no sirve | seguridad | PASS | 0.3s |
| IDOR-09 | IDOR/BOLA | sin token o con basura, 6 rutas privadas representativas dan 401 | seguridad | PASS | 0.2s |
| VERT-01 | Autorización vertical | member no puede acciones de owner (403) | seguridad | PASS | 0.4s |
| VERT-02 | Autorización vertical | la UI de member no muestra Cerrar desafio antes de fecha_fin | seguridad | PASS | 0.7s |
| VERT-03 | Autorización vertical | owner no puede salir de su propio grupo (409) | seguridad | PASS | 0.3s |
| FUGA-01 | Fuga de datos | JSON crudo de rendir no trae es_correcta, ni para el autor | seguridad | PASS | 0.3s |
| FUGA-02 | Fuga de datos | la pagina de rendir no filtra la respuesta en el HTML | seguridad | PASS | 0.7s |
| FUGA-03 | Fuga de datos | no autor en /materias/.../tests/{id} no ve la marca de correcta | seguridad | PASS | 0.5s |
| FUGA-04 | Fuga de datos | materia ranking no expone email aun sin nombre | seguridad | PASS | 0.4s |
| ECO-01 | Integridad económica | gastar sin saldo da 402 sin movimiento ni generacion | seguridad | PASS | 0.4s |
| ECO-02 | Integridad económica | cierre concurrente paga un solo gano_desafio | seguridad | PASS | 7.2s |
| ECO-03 | Integridad económica | puntaje y total manipulados por el cliente se ignoran | seguridad | PASS | 5.2s |
| ECO-04 | Integridad económica | respuestas invalidas (duplicadas, incompletas, opcion ajena, segundos) dan 422 | seguridad | PASS | 5.1s |
| ECO-05 | Integridad económica | farmeo en solitario: un solo elegible no gana ni cobra | seguridad | PASS | 0.3s |
| ECO-06 | Integridad económica | autor mas un miembro: un solo elegible, sin premio | seguridad | PASS | 7.6s |
| ECO-07 | Integridad económica | autor con mejor puntaje no es elegible; gana el mejor elegible | seguridad | PASS | 2.9s |
| ECO-08 | Integridad económica | miembro expulsado no puede ganar | seguridad | PASS | 2.8s |
| ECO-09 | Integridad económica | rendir concurrente deja un solo intento | seguridad | PASS | 0.7s |
| ECO-10 | Integridad económica | generaciones concurrentes no dejan saldo negativo ni doble cobro | seguridad | PASS | 0.4s |
| ECO-11 | Integridad económica | bono inicial concurrente se acredita una sola vez | seguridad | PASS | 0.1s |
| SEC-01 | Secretos/headers | respuestas y errores no incluyen secretos ni stack traces | seguridad | PASS | 0.2s |
| SEC-02 | Secretos/headers | JSON malformado responde 422 sin detalles internos | seguridad | PASS | 0.1s |
| SEC-03 | Secretos/headers | CORS no es * y solo refleja el origen permitido | seguridad | PASS | 0.0s |
| INY-01 | Inyección | payloads SQL-ish se guardan literales y no rompen | seguridad | PASS | 0.2s |
| INY-02 | Inyección | comodines LIKE en la busqueda de materias no listan todo | seguridad | PASS | 0.1s |
| INY-03 | Inyección | XSS almacenado en nombres se muestra como texto | seguridad | PASS | 0.6s |
| INY-04 | Inyección | caracter NUL en textos no provoca 500 | seguridad | PASS | 0.2s; FAIL inicial, ver F1 |
| INY-05 | Inyección | textos mas largos que la columna no provocan 500 | seguridad | PASS | 0.2s; FAIL inicial, ver F2 |
| INY-06 | Inyección | referencias inexistentes dan error de cliente, no 500 | seguridad | PASS | 0.3s |
| INY-07 | Inyección | fechas invalidas dan 422 y no 500 | seguridad | PASS | 0.2s |
| GUA-01 | Guardas modo test | POST /api/test/login responde 404 y no figura en OpenAPI | seguridad | PASS | 0.1s |
| GUA-02 | Guardas modo test | un token HS256 de test emitido por el modo test no abre /api/me en modo normal (sin JWKS no hay otro camino) | seguridad | PASS | 0.2s |
| GUA-03 | Guardas modo test | un token HS256 forjado con el secreto de test no abre /api/me en modo normal (sin JWKS no hay otro camino) | seguridad | PASS | 0.1s |
| GUA-04 | Guardas modo test | control: el modo test si acepta su propio token | seguridad | PASS | 0.1s |
| GUA-05 | Guardas modo test | backend con AUTH_MODE=test y APP_ENV=production no arranca | seguridad | PASS | 1.2s |
| GUA-06 | Guardas modo test | backend con AUTH_MODE=test sin secreto no arranca | seguridad | PASS | 1.2s |
| GUA-07 | Guardas modo test | login normal no renderiza la UI de test aunque el env de runtime diga test | seguridad | PASS | 7.9s |
| GUA-08 | Guardas modo test | cookie de test forjada no da acceso en el build normal | seguridad | PASS | 8.0s |
| GUA-09 | Guardas modo test | el bundle normal no contiene el login de test | seguridad | PASS | 0.3s |
| GUA-10 | Guardas modo test | control: el bundle de test si lo contiene y el secreto no esta en ninguno | seguridad | PASS | 2.5s |

## FAIL encontrados y arreglados

### F1. Texto con carácter NUL responde 500 (INY-04)

- **Bug:** `POST` con `"a\u0000b"` en nombres o títulos (materias, grupos, tests, semestres, eventos, código de invitación) respondía 500. Cualquier usuario autenticado podía provocar errores de servidor a voluntad; no se filtraba información.
- **Causa raíz:** los schemas aceptan NUL y psycopg2 lanza `ValueError` al adaptar el parámetro, antes de que SQLAlchemy lo envuelva. Nada lo traducía a un error de cliente.
- **Fix:** manejador global que responde 422 solo ante ese error; otro `ValueError` sigue siendo 500. `backend/app/main.py:19` y `:38`. Commits `820fdd6` (primer intento, asumía `StatementError` y no resolvía el caso: INY-04 siguió en rojo) y `7605a18` (fix efectivo).
- **Regresión:** `backend/tests/test_main.py::test_texto_con_nul_da_422` (usa el error real de psycopg2), `test_otros_errores_siguen_siendo_500` y el e2e INY-04.

### F2. Texto más largo que la columna responde 500 (INY-05)

- **Bug:** 5000 caracteres en `semestres.nombre`, `cursos.nombre/codigo` o `eventos.titulo` respondían 500.
- **Causa raíz:** esos schemas no limitan el largo y Postgres rechaza el valor con `StringDataRightTruncation`. SQLite, usado en los tests unitarios, no impone largo, por eso no se había visto.
- **Fix:** el mismo manejador global traduce `DataError` a 422 sin exponer SQL. `backend/app/main.py:19` y `:37`, commit `820fdd6`.
- **Regresión:** `backend/tests/test_main.py::test_texto_largo_da_422_sin_filtrar_sql` y el e2e INY-05.

### F3. Tras expulsar, el ranking sigue mostrando al expulsado (GRU-04)

- **Bug:** en el detalle del grupo, el expulsado desaparecía de Miembros pero seguía en "Ranking del grupo" hasta recargar.
- **Causa raíz:** la lista de miembros se actualiza en cliente, pero el leaderboard es un prop del servidor (que ya excluye al expulsado) y no se volvía a pedir.
- **Fix:** `router.refresh()` tras expulsar. `frontend/app/(app)/grupos/[id]/grupo-detalle-client.tsx:100`, commit `08149ea`.
- **Regresión:** `frontend/tests/grupo-detalle-client.test.tsx` ("shows the rotated code fetched after expelling") y el e2e GRU-04.

### F4. `scripts/e2e.sh` no encontraba el compose en Git Bash (tooling)

- **Bug:** con `MSYS_NO_PATHCONV=1`, la ruta absoluta `/c/...` llegaba sin traducir a Docker y el compose no levantaba ni se tumbaba.
- **Causa raíz:** la variable, necesaria para no alterar rutas dentro de los contenedores, también desactiva la traducción de la ruta del archivo.
- **Fix:** el script trabaja con rutas relativas a la raíz. `scripts/e2e.sh:7-8`, commit `f3966fd`.
- **Regresión:** la corrida final por `scripts/e2e.sh` (salida 0, sin contenedores ni volúmenes `conecta-u-e2e` restantes).

## Riesgos residuales

| Severidad | Riesgo | Detalle y solución futura |
|---|---|---|
| Media | `segundos` lo envía el cliente | Desempata el premio y se puede falsear. Solución: registrar la hora de inicio en el servidor. |
| Media | Colusión entre dos cuentas | Dos cuentas que no sean autoras cumplen el mínimo de 2 elegibles y pueden farmear 15 créditos por desafío. Requiere rediseño antifraude. |
| Media | Sin rate limit | Login, generación de IA y escrituras no tienen límite. Solución: limitar por usuario e IP en el borde o con middleware. |
| Baja | Preguntas visibles antes de rendir | `GET /api/tests/{id}` entrega las preguntas, sin `es_correcta`, a cualquier usuario autenticado, incluso con un desafío abierto. Regla actual del producto. |
| Baja | `/docs` y `/openapi.json` públicos | También con `APP_ENV=production` (visto en GUA-01). No exponen secretos. Solución: desactivarlos en producción. |
| Baja | Sin headers de seguridad en el frontend | `next.config.ts` no define CSP, `X-Frame-Options` ni similares. React escapó el XSS probado (INY-03), pero no hay defensa adicional. |
| Baja | Semestre con fin anterior al inicio | El schema no lo valida; INY-07 solo comprueba que no responda 500. Es un problema de datos, no de seguridad. |
| Baja | Token Supabase válido sin `email` | `backend/app/core/security.py:61` daría `KeyError` y 500. Visto en revisión de código, no ejecutado; con Google OAuth el email siempre viene. El modo test sí lo exige. |
| Baja | Imágenes Docker como root y secreto de test en el compose | Solo aplican al entorno e2e local; ese secreto no sirve fuera de él (GUA-02 y GUA-03 prueban que no hay camino alternativo sin JWKS; que el backend normal rechace HS256 lo prueba el unitario `test_supabase_no_tiene_ruta_de_login_y_rechaza_hs256`) y no está en los bundles (GUA-10). |

No verificado aquí: flujo real con Supabase y Google OAuth, proveedor Claude real, navegadores distintos de Chromium, ejecución en Linux o CI (`ci.yml` no corre esta suite) y carga o rendimiento.

## Cómo levantar todo en local

Requisitos: Docker Desktop. Para la suite, además Node 20+ y Git Bash en Windows.

```bash
# App completa (sin Supabase ni clave LLM)
docker compose -f docker-compose.e2e.yml up --build
# Web: http://localhost:3001 (entra con cualquier email)  API: http://localhost:8001

# Apagar y borrar datos
docker compose -f docker-compose.e2e.yml down -v

# Suite completa: levanta, espera health, corre Playwright y tumba con volúmenes
scripts/e2e.sh
# Filtrar casos o dejar el entorno arriba para depurar
scripts/e2e.sh -g "ECO-"
E2E_KEEP=1 scripts/e2e.sh
```

El modo test solo arranca con `APP_ENV=test` o `local`. No uses este compose en producción. Los puertos se publican solo en `127.0.0.1`.

Variables que usa el entorno:

| Variable | Dónde | Efecto |
|---|---|---|
| `AUTH_MODE` | backend | `supabase` (por defecto) o `test`. En `test` monta `/api/test/login` y valida tokens HS256 con `TEST_AUTH_SECRET`. |
| `APP_ENV` | backend | `AUTH_MODE=test` solo arranca con `test` o `local`; sin definir o con otro valor el proceso aborta. |
| `CORS_ORIGINS` | backend | Orígenes permitidos separados por coma; `*` se rechaza. Por defecto solo `http://localhost:3000`, así que el frontend del compose (3001, 3002) debe declararse (el compose ya lo hace). |
| `API_INTERNAL_URL` | frontend (runtime) | URL del backend vista desde el contenedor web (`http://backend:8000`), para el render en servidor. |
| `NEXT_PUBLIC_AUTH_MODE` | frontend (build) | Se fija al construir; el valor de runtime no activa el modo test. |
| `NEXT_PUBLIC_API_BASE_URL` | frontend (build) | URL del backend vista desde el navegador. |

`frontend/.env.local.example` no se modificó: mi permiso no permite leer ni editar ese archivo.
