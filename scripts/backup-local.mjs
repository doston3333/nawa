import "dotenv/config";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

export function localPaths(cwd = process.cwd()) {
  const dataDir = resolve(process.env.NAWA_DATA_DIR || join(cwd, ".data"));
  const uploadsDir = resolve(process.env.NAWA_UPLOADS_DIR || join(dataDir, "uploads"));
  const backupRoot = resolve(process.env.NAWA_BACKUP_DIR || join(dataDir, "backups"));
  return { dataDir, uploadsDir, backupRoot };
}

export function timestampLabel(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function hashFile(path) {
  const contents = await readFile(path);
  return createHash("sha256").update(contents).digest("hex");
}

async function runCommand(command, args) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.once("error", (error) => reject(new Error(`${command} is required for backups: ${error.message}`)));
    child.once("exit", (code, signal) => {
      if (code === 0) return resolvePromise();
      reject(new Error(`${command} failed${signal ? ` (${signal})` : ` with exit code ${code ?? "unknown"}`}`));
    });
  });
}

export async function createBackup({ cwd = process.cwd(), now = new Date(), dryRun = false, commandRunner = runCommand } = {}) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const { uploadsDir, backupRoot } = localPaths(cwd);
  const destination = join(backupRoot, timestampLabel(now));
  const temporary = `${destination}.tmp-${process.pid}`;
  const dumpPath = join(temporary, "nawa.sql");
  const copiedUploads = join(temporary, "uploads");
  const manifestPath = join(temporary, "manifest.json");

  if (dryRun) {
    return { destination, dumpPath: join(destination, "nawa.sql"), uploads: join(destination, "uploads"), databaseUrl };
  }

  await mkdir(uploadsDir, { recursive: true });
  await mkdir(backupRoot, { recursive: true });
  await mkdir(temporary, { recursive: true });
  try {
    await commandRunner("pg_dump", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--file", dumpPath, databaseUrl]);
    await cp(uploadsDir, copiedUploads, { recursive: true });
    const manifest = {
      format: 1,
      createdAt: now.toISOString(),
      databaseDump: "nawa.sql",
      uploadsDirectory: "uploads",
      databaseDumpSha256: await hashFile(dumpPath),
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rename(temporary, destination);
    return { destination, manifest };
  } catch (error) {
    const { rm } = await import("node:fs/promises");
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await createBackup({ dryRun });
  if (dryRun) {
    console.log(`Would write backup to ${result.destination}`);
    return;
  }
  console.log(`Backup written to ${result.destination}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
