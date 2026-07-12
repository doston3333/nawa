export function isLocalDatabaseUrl(value: string): boolean;
export function validateBackupDirectory(backupDirectory: string): Promise<{
  directory: string;
  manifest: { format: number; databaseDump: string; uploadsDirectory: string };
  dumpPath: string;
  uploadsPath: string;
}>;
export function restoreBackup(backupDirectory: string, options?: { cwd?: string; dryRun?: boolean }): Promise<{
  directory: string;
  manifest: { format: number; databaseDump: string; uploadsDirectory: string };
  dumpPath: string;
  uploadsPath: string;
  uploadsDir?: string;
  databaseUrl?: string;
}>;
