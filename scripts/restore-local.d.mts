export function isLocalDatabaseUrl(value: string): boolean;
export function validateBackupDirectory(backupDirectory: string): Promise<{
  directory: string;
  manifest: { format: number; databaseDump: string; uploadsDirectory: string; databaseDumpSha256: string };
  dumpPath: string;
  uploadsPath: string;
}>;
export function restoreBackup(backupDirectory: string, options?: { cwd?: string; dryRun?: boolean; commandRunner?: (command: string, args: string[]) => Promise<void> }): Promise<{
  directory: string;
  manifest: { format: number; databaseDump: string; uploadsDirectory: string; databaseDumpSha256: string };
  dumpPath: string;
  uploadsPath: string;
  uploadsDir?: string;
  databaseUrl?: string;
}>;
