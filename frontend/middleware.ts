import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { TEST_COOKIE } from "./lib/auth/test-session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/cursos",
  "/calendario",
  "/grupos",
  "/materias",
  "/creditos",
  "/ranking",
  "/ia",
];

export async function middleware(request: NextRequest) {
  // Valor fijado en build (next.config): un build normal elimina esta rama y
  // una cookie forjada no cambia nada. El backend valida el token igualmente.
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "test") {
    const protegida = PROTECTED_PREFIXES.some((prefix) =>
      request.nextUrl.pathname.startsWith(prefix),
    );
    return protegida && !request.cookies.has(TEST_COOKIE)
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (isProtected && !data.user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cursos/:path*",
    "/calendario/:path*",
    "/grupos/:path*",
    "/materias/:path*",
    "/creditos/:path*",
    "/ranking/:path*",
    "/ia/:path*",
  ],
};
