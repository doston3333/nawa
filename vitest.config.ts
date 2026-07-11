import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/tests/e2e/**", "**/.next/**"],
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
});
