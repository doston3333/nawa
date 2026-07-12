import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBackup, hashFile } from "./backup-local.mjs";
import { isLocalDatabaseUrl, restoreBackup, validateBackupDirectory } from "./restore-local.mjs";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAllowRestore = process.env.ALLOW_RESTORE;
const originalDataDir = process.env.NAWA_DATA_DIR;
const originalUploadsDir = process.env.NAWA_UPLOADS_DIR;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalAllowRestore === undefined) delete process.env.ALLOW_RESTORE;
  else process.env.ALLOW_RESTORE = originalAllowRestore;
  if (originalDataDir === undefined) delete process.env.NAWA_DATA_DIR;
  else process.env.NAWA_DATA_DIR = originalDataDir;
  if (originalUploadsDir === undefined) delete process.env.NAWA_UPLOADS_DIR;
  else process.env.NAWA_UPLOADS_DIR = originalUploadsDir;
});

describe("local backup and restore safety checks", () => {
  it("plans a backup containing a database dump and uploads directory", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "nawa-backup-"));
    process.env.DATABASE_URL = "postgresql://nawa:nawa_local@localhost:5439/nawa";
    const result = await createBackup({ cwd, dryRun: true });
    expect(result.dumpPath).toMatch(/nawa\.sql$/);
    expect(result.uploads).toMatch(/uploads$/);
  });

  it("creates a complete backup fixture with a database dump and uploaded original", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "nawa-backup-fixture-"));
    process.env.DATABASE_URL = "postgresql://nawa:nawa_local@localhost:5439/nawa";
    delete process.env.NAWA_DATA_DIR;
    delete process.env.NAWA_UPLOADS_DIR;
    await mkdir(join(cwd, ".data", "uploads"), { recursive: true });
    await writeFile(join(cwd, ".data", "uploads", "original.txt"), "source text\n");
    const result = await createBackup({
      cwd,
      now: new Date("2026-07-12T12:00:00.000Z"),
      commandRunner: async (_command, args) => {
        const dumpPath = args[args.indexOf("--file") + 1]!;
        await writeFile(dumpPath, "-- fixture dump\n");
      },
    });
    expect(result.manifest?.databaseDumpSha256).toBe(await hashFile(join(result.destination, "nawa.sql")));
    await expect(readFile(join(result.destination, "uploads", "original.txt"), "utf8")).resolves.toBe("source text\n");
    await expect(validateBackupDirectory(result.destination)).resolves.toMatchObject({
      dumpPath: join(result.destination, "nawa.sql"),
    });
  });

  it("validates a manifest, dump, and uploads directory before restore", async () => {
    const backup = await mkdtemp(join(tmpdir(), "nawa-restore-"));
    await mkdir(join(backup, "uploads"));
    await writeFile(join(backup, "nawa.sql"), "-- test dump\n");
    await writeFile(
      join(backup, "manifest.json"),
      JSON.stringify({
        format: 1,
        databaseDump: "nawa.sql",
        uploadsDirectory: "uploads",
        databaseDumpSha256: await hashFile(join(backup, "nawa.sql")),
      }),
    );
    await expect(validateBackupDirectory(backup)).resolves.toMatchObject({ dumpPath: join(backup, "nawa.sql") });
  });

  it("rejects a tampered database dump before restore", async () => {
    const backup = await mkdtemp(join(tmpdir(), "nawa-tampered-"));
    await mkdir(join(backup, "uploads"));
    await writeFile(join(backup, "nawa.sql"), "-- original dump\n");
    const checksum = await hashFile(join(backup, "nawa.sql"));
    await writeFile(
      join(backup, "manifest.json"),
      JSON.stringify({ format: 1, databaseDump: "nawa.sql", uploadsDirectory: "uploads", databaseDumpSha256: checksum }),
    );
    await writeFile(join(backup, "nawa.sql"), "-- tampered dump\n");
    await expect(validateBackupDirectory(backup)).rejects.toThrow(/checksum mismatch/i);
    process.env.DATABASE_URL = "postgresql://nawa:nawa_local@localhost:5439/nawa";
    await expect(restoreBackup(backup, { dryRun: true })).rejects.toThrow(/checksum mismatch/i);
  });

  it("restores uploads to a custom data directory after a stubbed psql succeeds", async () => {
    const root = await mkdtemp(join(tmpdir(), "nawa-roundtrip-"));
    const backup = join(root, "backup");
    const targetData = join(root, "restored-data");
    await mkdir(join(backup, "uploads"), { recursive: true });
    await writeFile(join(backup, "nawa.sql"), "-- fixture dump\n");
    await writeFile(join(backup, "uploads", "scan.png"), "binary fixture\n");
    await writeFile(
      join(backup, "manifest.json"),
      JSON.stringify({
        format: 1,
        databaseDump: "nawa.sql",
        uploadsDirectory: "uploads",
        databaseDumpSha256: await hashFile(join(backup, "nawa.sql")),
      }),
    );
    process.env.DATABASE_URL = "postgresql://nawa:nawa_local@[::1]:5439/nawa";
    process.env.NAWA_DATA_DIR = targetData;
    const calls: string[] = [];
    const result = await restoreBackup(backup, {
      commandRunner: async (command, args) => {
        calls.push(`${command} ${args.join(" ")}`);
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("psql");
    expect(result.uploadsDir).toBe(join(targetData, "uploads"));
    await expect(readFile(join(targetData, "uploads", "scan.png"), "utf8")).resolves.toBe("binary fixture\n");
  });

  it("rejects a missing backup directory", async () => {
    await expect(validateBackupDirectory("/tmp/nawa-backup-does-not-exist")).rejects.toThrow(/manifest is missing or invalid/i);
  });

  it("refuses a remote database unless explicitly allowed", async () => {
    process.env.DATABASE_URL = "postgresql://nawa:secret@db.example.com/nawa";
    delete process.env.ALLOW_RESTORE;
    await expect(restoreBackup("/tmp/nawa-backup-does-not-exist", { dryRun: true })).rejects.toThrow(/non-local DATABASE_URL/i);
  });

  it("classifies local database hosts used by Compose and the host machine", () => {
    expect(isLocalDatabaseUrl("postgresql://nawa:nawa_local@localhost:5439/nawa")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://nawa:nawa_local@db:5432/nawa")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://nawa:nawa_local@[::1]:5439/nawa")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://nawa:secret@db.example.com/nawa")).toBe(false);
  });
});
