export function createBackup(options?: { cwd?: string; now?: Date; dryRun?: boolean }): Promise<{
  destination: string;
  dumpPath?: string;
  uploads?: string;
  databaseUrl?: string;
  manifest?: { format: number; createdAt: string; databaseDump: string; uploadsDirectory: string; databaseDumpSha256: string };
}>;
