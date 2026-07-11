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
      ENABLE_PUBLIC_DEMO: "true",
      ENABLE_DEMO_LEARNER: "true",
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://nawa:nawa_local@localhost:5439/nawa",
    },
  },
});
