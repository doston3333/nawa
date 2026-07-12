import "dotenv/config";
import { defineConfig } from "@playwright/test";

const production = process.env.E2E_PRODUCTION === "1" || process.env.E2E_PRODUCTION === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // The local PostgreSQL fixture is intentionally shared by all browser
  // contexts; serialize the small personal-user suite to avoid cross-test
  // progress races.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    command: production ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI && !production,
    env: {
      ...process.env,
      ENABLE_PUBLIC_DEMO: "true",
      ENABLE_DEMO_LEARNER: "true",
      E2E_ALLOW_RATE_LIMIT_BYPASS: "true",
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://nawa:nawa_local@localhost:5439/nawa",
    },
  },
});
