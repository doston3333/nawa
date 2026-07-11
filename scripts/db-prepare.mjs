#!/usr/bin/env node
/**
 * Production-safe database prepare: generate client, apply migrations, seed curriculum.
 * Run after DATABASE_URL is set on the host.
 */
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("pnpm", ["db:generate"]);
run("pnpm", ["exec", "prisma", "migrate", "deploy"]);
run("pnpm", ["db:seed"]);
console.log("Database prepared.");
