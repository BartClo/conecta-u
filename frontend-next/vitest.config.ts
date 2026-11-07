import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
      exclude: ["**/*.config.*", "app/**/layout.tsx", "app/**/page.tsx", ".next/**"],
    },
  },
});
