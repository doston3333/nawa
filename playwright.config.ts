import "dotenv/config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      ENABLE_DEMO_LEARNER: "true",
      DEMO_LEARNER_ID: process.env.DEMO_LEARNER_ID ?? "00000000-0000-4000-8000-000000000001",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://nawa:nawa_local@localhost:5439/nawa",
    },
  },
});
