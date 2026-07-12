"use client";

import { useOfflineStatus } from "@/lib/offline/use-offline-status";

export function SyncStatus({ profileId, internetRequired = false }: { profileId?: string; internetRequired?: boolean }) {
  const status = useOfflineStatus(profileId);
  let message = "Synced";
  if (internetRequired && !status.online) message = "Internet required for this action";
  else if (status.syncError) message = "Sync needs attention";
  else if (status.pendingCount > 0) message = "Saved locally · waiting to sync";
  return <p className="study-room-status-kicker" role="status" aria-live="polite">{message}</p>;
}
