import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBackup } from "./backup-local.mjs";
import { isLocalDatabaseUrl, restoreBackup, validateBackupDirectory } from "./restore-local.mjs";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAllowRestore = process.env.ALLOW_RESTORE;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalAllowRestore === undefined) delete process.env.ALLOW_RESTORE;
  else process.env.ALLOW_RESTORE = originalAllowRestore;
});

describe("local backup and restore safety checks", () => {
  it("plans a backup containing a database dump and uploads directory", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "nawa-backup-"));
    process.env.DATABASE_URL = "postgresql://nawa:nawa_local@localhost:5439/nawa";
    const result = await createBackup({ cwd, dryRun: true });
    expect(result.dumpPath).toMatch(/nawa\.sql$/);
    expect(result.uploads).toMatch(/uploads$/);
  });

  it("validates a manifest, dump, and uploads directory before restore", async () => {
    const backup = await mkdtemp(join(tmpdir(), "nawa-restore-"));
    await mkdir(join(backup, "uploads"));
    await writeFile(join(backup, "nawa.sql"), "-- test dump\n");
    await writeFile(join(backup, "manifest.json"), JSON.stringify({ format: 1, databaseDump: "nawa.sql", uploadsDirectory: "uploads" }));
    await expect(validateBackupDirectory(backup)).resolves.toMatchObject({ dumpPath: join(backup, "nawa.sql") });
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
    expect(isLocalDatabaseUrl("postgresql://nawa:secret@db.example.com/nawa")).toBe(false);
  });
});
