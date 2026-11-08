import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  Coins,
  Crown,
  Flame,
  KeyRound,
  Plus,
  Sparkles,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel } from "@/components/shared/panel";
import { StatCard } from "@/components/shared/stat-card";
import { Graph3D } from "@/components/dashboard/graph-3d";
import { apiFetchServer, porGrupo } from "@/lib/api-server";
import {
  desafiosPendientes,
  mejoresPosiciones,
  tiempoRestante,
} from "@/lib/dashboard";
import { buildGraph, COLOR_TIPO } from "@/lib/graph";
import { MOTIVO_CREDITO_LABEL } from "@/lib/motivosCredito";
import { semestreActivo } from "@/lib/semestre";
import type {
  Curso,
  DesafioOut,
  Grupo,
  LeaderboardEntry,
  Miembro,
  MovimientosCreditoOut,
  SaldoCreditoOut,
  Semestre,
} from "@/lib/types";

interface Me {
  id: string;
  name: string | null;
  email: string;
}

export default async function DashboardPage() {
  const [me, semestres, grupos, saldo, movimientos] = await Promise.all([
    apiFetchServer<Me>("/api/me"),
    apiFetchServer<Semestre[]>("/api/semestres"),
    apiFetchServer<Grupo[]>("/api/grupos"),
    apiFetchServer<SaldoCreditoOut>("/api/creditos/saldo"),
    apiFetchServer<MovimientosCreditoOut>("/api/creditos/movimientos?limit=6"),
  ]);
  const activo = semestreActivo(semestres);
  const [cursos, miembros, desafios, tablas] = await Promise.all([
    activo
      ? apiFetchServer<Curso[]>(`/api/cursos?semestre_id=${activo.id}`)
      : Promise.resolve([]),
    porGrupo<Miembro[]>(grupos, (id) => `/api/grupos/${id}/miembros`),
    porGrupo<DesafioOut[]>(grupos, (id) => `/api/grupos/${id}/desafios`),
    porGrupo<LeaderboardEntry[]>(
      grupos,
      (id) => `/api/grupos/${id}/leaderboard`,
    ),
  ]);

  const nombre = me.name ?? me.email;
  const pendientes = desafiosPendientes(grupos, desafios);
  const posiciones = mejoresPosiciones(grupos, tablas, me.id);
  const victorias = posiciones.reduce((s, p) => s + p.ganados, 0);
  const podios = posiciones.filter((p) => p.posicion <= 3).length;
  const grafo = buildGraph(
    { id: me.id, nombre: nombre.split(/[\s@]/)[0] },
    grupos,
    cursos,
    miembros,
  );
  const companeros = grafo.nodes.filter((n) => n.tipo === "companero").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">
            {pendientes.length > 0
              ? `Tienes ${pendientes.length} ${pendientes.length === 1 ? "desafío esperándote" : "desafíos esperándote"}`
              : "Tu centro de mando"}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight lg:text-4xl">
            Hola, {me.name?.split(" ")[0] ?? me.email}
          </h1>
        </div>
        <nav aria-label="Accesos rápidos" className="flex flex-wrap gap-2">
          <Accion href="/grupos" icon={Plus} primaria>
            Crear grupo
          </Accion>
          <Accion href="/grupos" icon={KeyRound}>
            Unirse a un grupo
          </Accion>
          <Accion href="/ia/resumenes/nuevo" icon={Sparkles}>
            Generar con IA
          </Accion>
        </nav>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          tono="text-xp"
          borde="from-xp/20"
          valor={saldo.saldo}
          etiqueta="Créditos"
          pie="para gastar en IA"
          href="/creditos"
        />
        <StatCard
          icon={Trophy}
          tono="text-gold"
          borde="from-gold/20"
          valor={victorias}
          etiqueta="Victorias"
          pie={`${podios} ${podios === 1 ? "podio" : "podios"} en tus grupos`}
          href="/ranking"
        />
        <StatCard
          icon={Swords}
          tono="text-cyan"
          borde="from-cyan/20"
          valor={pendientes.length}
          etiqueta="Desafíos por rendir"
          pie="abiertos en tus grupos"
        />
        <StatCard
          icon={Users}
          tono="text-primary"
          borde="from-primary/25"
          valor={grupos.length}
          etiqueta="Grupos"
          pie={`${companeros} ${companeros === 1 ? "compañero" : "compañeros"}`}
          href="/grupos"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="relative h-[540px] overflow-hidden rounded-2xl border bg-[#030208] xl:col-span-8">
          {grupos.length + cursos.length > 0 ? (
            <Graph3D data={grafo} />
          ) : (
            <EmptyState
              icon={Flame}
              titulo="Tu constelación está vacía"
              texto="Únete a un grupo o crea tus cursos y aquí verás crecer tu red: grupos, materias y compañeros."
              action={
                <Link
                  href="/grupos"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Explorar grupos <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
          )}
          <div className="pointer-events-none absolute left-4 top-4">
            <h2 className="font-heading text-lg font-semibold">
              Tu constelación
            </h2>
            <p className="text-xs text-muted-foreground">
              Arrastra para orbitar · rueda para zoom · click para abrir
            </p>
          </div>
          <ul className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {[
              ["Tú", COLOR_TIPO.yo],
              ["Grupos", COLOR_TIPO.grupo],
              ["Materias", COLOR_TIPO.materia],
              ["Cursos", "#f97316"],
              ["Compañeros", COLOR_TIPO.companero],
            ].map(([t, c]) => (
              <li key={t} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-4">
          <Panel titulo="Desafíos por rendir" icon={Swords} tono="text-cyan">
            {pendientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Estás al día. Cuando alguien lance un desafío en tus grupos
                aparecerá aquí.
              </p>
            ) : (
              <ul className="space-y-2">
                {pendientes.slice(0, 4).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/grupos/${d.grupo_id}/desafios/${d.id}`}
                      className="group flex items-center gap-3 rounded-lg border border-cyan/20 bg-cyan/5 p-2.5 transition-colors hover:border-cyan/50 hover:bg-cyan/10"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-cyan/15 text-cyan">
                        <Swords className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {d.test_titulo}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {d.grupo_nombre} · {tiempoRestante(d.fecha_fin)}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-4 text-cyan transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel titulo="Tus mejores posiciones" icon={Crown} tono="text-gold">
            {posiciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Rinde tu primer desafío para entrar al ranking de tu grupo.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {posiciones.slice(0, 4).map((p) => (
                  <li key={p.grupo.id}>
                    <Link
                      href={`/grupos/${p.grupo.id}`}
                      className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted"
                    >
                      <span
                        className={`grid size-8 place-items-center rounded-md font-heading text-sm font-bold tabular ${
                          p.posicion === 1
                            ? "bg-gold text-background"
                            : p.posicion <= 3
                              ? "bg-gold/20 text-gold"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        #{p.posicion}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {p.grupo.nombre}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          de {p.participantes} · {p.puntos} pts
                        </span>
                      </span>
                      {p.ganados > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-gold">
                          <Trophy className="size-3.5" aria-hidden />
                          {p.ganados}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel titulo="Mis grupos" icon={Users} tono="text-primary">
            {grupos.length === 0 ? (
              <EmptyState
                icon={Users}
                titulo="Aún no estás en ningún grupo"
                texto="Los grupos son donde se compite: crea uno para tu materia o únete con el código de un compañero."
                action={
                  <Link
                    href="/grupos"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Crear o unirme <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {grupos.map((g) => {
                  const abiertos = (desafios[g.id] ?? []).filter(
                    (d) => d.estado === "abierto",
                  ).length;
                  const n = (miembros[g.id] ?? []).length;
                  return (
                    <li key={g.id}>
                      <Link
                        href={`/grupos/${g.id}`}
                        className="group block h-full rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_8px_30px_-12px_var(--primary)]"
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                          {g.materia_nombre}
                        </span>
                        <span className="mt-0.5 block truncate font-heading text-base font-semibold">
                          {g.nombre}
                        </span>
                        <span className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" aria-hidden />
                            {n}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${abiertos ? "text-cyan" : ""}`}
                          >
                            <Swords className="size-3.5" aria-hidden />
                            {abiertos} {abiertos === 1 ? "abierto" : "abiertos"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
        <div className="xl:col-span-4">
          <Panel
            titulo="Actividad de créditos"
            icon={Coins}
            tono="text-xp"
            href="/creditos"
          >
            {movimientos.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin movimientos todavía. Gana un desafío para sumar créditos.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {movimientos.items.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {MOTIVO_CREDITO_LABEL[m.motivo]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </span>
                    <span
                      className={`font-heading text-sm font-bold tabular ${m.delta > 0 ? "text-xp" : "text-destructive"}`}
                    >
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Accion({
  href,
  icon: Icon,
  primaria,
  children,
}: {
  href: string;
  icon: LucideIcon;
  primaria?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-all ${
        primaria
          ? "bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)] hover:brightness-110"
          : "border bg-card/60 hover:border-primary/50 hover:bg-card"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
