import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestLoginForm } from "../components/auth/test-login-form";
import { NavSidebar } from "../components/nav-sidebar";
import { apiFetchClient } from "../lib/api-client";
import {
  TEST_COOKIE,
  clearTestSession,
  readTestToken,
  setTestSession,
} from "../lib/auth/test-session";
import { createBrowserSupabaseClient } from "../lib/supabase/client";
import { middleware } from "../middleware";
import nextConfig from "../next.config";

const getUser = vi.fn();
const push = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));
vi.mock("../lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function peticion(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

const FORJADA = `${TEST_COOKIE}=token-forjado`;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ saldo: 1 }),
    }),
  );
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api");
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: null } });
  push.mockReset();
  clearTestSession();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("modo normal: una cookie de test forjada no da acceso", () => {
  it.each([undefined, "supabase", "", "TEST"])(
    "middleware con NEXT_PUBLIC_AUTH_MODE=%s redirige a /login",
    async (modo) => {
      if (modo !== undefined) vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", modo);
      const r = await middleware(peticion("/dashboard", FORJADA));
      expect(r.status).toBe(307);
      expect(r.headers.get("location")).toContain("/login");
      expect(getUser).toHaveBeenCalled();
    },
  );

  it("apiFetchClient ignora la cookie y usa la sesion de Supabase", async () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { getSession: async () => ({ data: { session: null } }) },
    });
    setTestSession("token-forjado");
    await apiFetchClient("/api/me");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("logout usa Supabase y no toca la sesion de test", async () => {
    const signOut = vi.fn();
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { signOut, getSession: async () => ({ data: { session: null } }) },
    });
    setTestSession("t");
    render(
      <QueryClientProvider client={new QueryClient()}>
        <NavSidebar userName="A" userEmail="a@b.co" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(readTestToken()).toBe("t");
  });

  it("next.config fija el modo en build: sin variable queda supabase", () => {
    // Sin este inlining, el env de runtime podria activar el modo en el servidor.
    expect(nextConfig.env?.NEXT_PUBLIC_AUTH_MODE).toBe("supabase");
  });
});

describe("modo test", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "test");
  });

  it("middleware exige la cookie y no consulta Supabase", async () => {
    const sin = await middleware(peticion("/grupos"));
    expect(sin.headers.get("location")).toContain("/login");
    const con = await middleware(peticion("/grupos", FORJADA));
    expect(con.headers.get("location")).toBeNull();
    const publica = await middleware(peticion("/login"));
    expect(publica.headers.get("location")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("apiFetchClient envia el token de la cookie sin crear cliente Supabase", async () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockClear();
    setTestSession("tok");
    await apiFetchClient("/api/me");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(createBrowserSupabaseClient).not.toHaveBeenCalled();
  });

  it("apiFetchClient sin cookie no envia Authorization", async () => {
    await apiFetchClient("/api/me");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("logout borra la cookie sin tocar Supabase", async () => {
    (createBrowserSupabaseClient as ReturnType<typeof vi.fn>).mockClear();
    setTestSession("t");
    render(
      <QueryClientProvider client={new QueryClient()}>
        <NavSidebar userName="A" userEmail="a@b.co" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(readTestToken()).toBeNull();
    expect(createBrowserSupabaseClient).not.toHaveBeenCalled();
  });
});

describe("TestLoginForm", () => {
  function enviar() {
    render(<TestLoginForm />);
    fireEvent.change(screen.getByLabelText(/email de prueba/i), {
      target: { value: "a@b.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /modo de prueba/i }));
  }

  it("guarda el token y entra al dashboard", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: "nuevo" }),
    });
    enviar();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/dashboard"));
    expect(readTestToken()).toBe("nuevo");
    expect(fetch).toHaveBeenCalledWith(
      "http://api/api/test/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("muestra error si el API responde mal o no responde", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    enviar();
    expect(await screen.findByText(/no se pudo iniciar/i)).toBeInTheDocument();
    expect(readTestToken()).toBeNull();

    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("red"));
    fireEvent.click(screen.getByRole("button", { name: /modo de prueba/i }));
    expect(await screen.findByText(/no se pudo iniciar/i)).toBeInTheDocument();
  });
});
