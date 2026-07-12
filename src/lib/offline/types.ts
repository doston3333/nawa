import type { SyncMutationInput, SyncPullResult, SyncPushResult } from "@/server/sync";

export type { SyncMutationInput, SyncPullResult, SyncPushResult };

export interface PendingMutation extends SyncMutationInput {
  attempts: number;
  lastError: string | null;
  lastErrorDetails?: unknown;
  queuedAt: string;
}

export interface CachedProfile {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface OfflineChange {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  revision: number;
  payload: unknown;
  profileId: string;
}

export interface FlushResult {
  pushed: number;
  acknowledged: number;
  conflicts: number;
  rejected: number;
  cursor?: string;
  error?: string;
}

export interface PullResult {
  cursor: string;
  hasMore: boolean;
  applied: number;
}
