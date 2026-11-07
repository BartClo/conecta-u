import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // e2e/ holds Playwright specs — they use @playwright/test, not vitest, and
    // must not be collected by the unit runner.
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
      // Measure our own logic (client components, form modals, lib helpers).
      // Excluded: Next server-runtime wrappers that can't execute in jsdom
      // (Server Components, middleware, cookie/Supabase SSR clients), the R3F
      // 3D scene (only its pure computeNodePositions is unit-testable — and it
      // is tested), and generated shadcn primitives.
      exclude: [
        "**/*.config.*",
        ".next/**",
        "app/**/layout.tsx",
        "app/**/page.tsx",
        "app/providers.tsx",
        "middleware.ts",
        "lib/supabase/**",
        "lib/api-server.ts",
        "components/ui/**",
        "components/dashboard/graph-3d.tsx",
      ],
    },
  },
});
