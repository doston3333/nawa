export function hashFile(path: string): Promise<string>;
export function createBackup(options?: { cwd?: string; now?: Date; dryRun?: boolean; commandRunner?: (command: string, args: string[]) => Promise<void> }): Promise<{
  destination: string;
  dumpPath?: string;
  uploads?: string;
  databaseUrl?: string;
  manifest?: { format: number; createdAt: string; databaseDump: string; uploadsDirectory: string; databaseDumpSha256: string };
}>;
