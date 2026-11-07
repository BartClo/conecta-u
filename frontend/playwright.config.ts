import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Corre contra docker-compose.e2e.yml, levantado por scripts/e2e.sh.
  fullyParallel: true,
  workers: 4,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
  },
});
