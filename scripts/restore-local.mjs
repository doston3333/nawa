import "dotenv/config";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

export function isLocalDatabaseUrl(value, { allowComposeHost = process.env.NAWA_COMPOSE_CONTEXT === "true" } = {}) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || (allowComposeHost && host === "db");
  } catch {
    return false;
  }
}

async function hashFile(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export async function validateBackupDirectory(backupDirectory) {
  const directory = resolve(backupDirectory);
  const manifestPath = join(directory, "manifest.json");
  const dumpPath = join(directory, "nawa.sql");
  const uploadsPath = join(directory, "uploads");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new Error(`Backup manifest is missing or invalid: ${manifestPath}`);
  }
  if (manifest?.format !== 1 || manifest.databaseDump !== "nawa.sql" || manifest.uploadsDirectory !== "uploads") {
    throw new Error("Backup manifest is not a supported Nawa backup");
  }
  const { stat } = await import("node:fs/promises");
  let dumpStat;
  let uploadsStat;
  try {
    [dumpStat, uploadsStat] = await Promise.all([stat(dumpPath), stat(uploadsPath)]);
  } catch {
    throw new Error(`Backup must contain nawa.sql and uploads/: ${directory}`);
  }
  if (!dumpStat.isFile()) throw new Error(`Backup dump is not a file: ${dumpPath}`);
  if (!uploadsStat.isDirectory()) throw new Error(`Backup uploads directory is missing: ${uploadsPath}`);
  if (typeof manifest.databaseDumpSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(manifest.databaseDumpSha256)) {
    throw new Error("Backup manifest is missing a valid databaseDumpSha256");
  }
  const actualHash = await hashFile(dumpPath);
  if (actualHash.toLowerCase() !== manifest.databaseDumpSha256.toLowerCase()) {
    throw new Error(`Backup database dump checksum mismatch: expected ${manifest.databaseDumpSha256}, got ${actualHash}`);
  }
  return { directory, manifest, dumpPath, uploadsPath };
}

async function runCommand(command, args) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.once("error", (error) => reject(new Error(`${command} is required for restore: ${error.message}`)));
    child.once("exit", (code, signal) => {
      if (code === 0) return resolvePromise();
      reject(new Error(`${command} failed${signal ? ` (${signal})` : ` with exit code ${code ?? "unknown"}`}`));
    });
  });
}

export async function restoreBackup(
  backupDirectory,
  {
    cwd = process.cwd(),
    dryRun = false,
    commandRunner = runCommand,
    copyDirectory = (source, destination) => cp(source, destination, { recursive: true }),
    renamePath = rename,
    removePath = rm,
  } = {},
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!isLocalDatabaseUrl(databaseUrl) && process.env.ALLOW_RESTORE !== "true") {
    throw new Error("Refusing to restore a non-local DATABASE_URL; set ALLOW_RESTORE=true to continue");
  }
  const backup = await validateBackupDirectory(backupDirectory);
  const dataDir = resolve(process.env.NAWA_DATA_DIR || join(cwd, ".data"));
  const uploadsDir = resolve(process.env.NAWA_UPLOADS_DIR || join(dataDir, "uploads"));
  if (dryRun) return { ...backup, uploadsDir, databaseUrl };
  await commandRunner("psql", ["--set", "ON_ERROR_STOP=1", "--dbname", databaseUrl, "--file", backup.dumpPath]);
  await mkdir(dirname(uploadsDir), { recursive: true });
  const stagedUploadsDir = `${uploadsDir}.restore-${process.pid}-${Date.now()}`;
  const previousUploadsDir = `${uploadsDir}.previous-${process.pid}-${Date.now()}`;
  await removePath(stagedUploadsDir, { recursive: true, force: true });
  try {
    await copyDirectory(backup.uploadsPath, stagedUploadsDir);
    let movedExisting = false;
    try {
      await renamePath(uploadsDir, previousUploadsDir);
      movedExisting = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    try {
      await renamePath(stagedUploadsDir, uploadsDir);
    } catch (error) {
      if (movedExisting) await renamePath(previousUploadsDir, uploadsDir);
      throw error;
    }
    if (movedExisting) await removePath(previousUploadsDir, { recursive: true, force: true });
  } catch (error) {
    await removePath(stagedUploadsDir, { recursive: true, force: true });
    throw error;
  }
  return { ...backup, uploadsDir };
}

async function main() {
  const backupDirectory = process.argv.find((arg) => !arg.startsWith("-") && arg !== process.argv[0] && arg !== process.argv[1]);
  if (!backupDirectory) throw new Error("Usage: pnpm restore:local -- <backup-directory> [--dry-run]");
  const result = await restoreBackup(backupDirectory, { dryRun: process.argv.includes("--dry-run") });
  console.log(`${process.argv.includes("--dry-run") ? "Would restore" : "Restored"} ${result.directory}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
