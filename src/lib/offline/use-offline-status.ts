"use client";

import { useEffect, useState } from "react";
import { listPendingMutations } from "./outbox";
import { flushOutbox, readLastSyncAt } from "./sync-client";

export interface OfflineStatus {
  online: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncError: string | null;
}

export function useOfflineStatus(profileId?: string): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>({
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    pendingCount: 0,
    lastSyncAt: null,
    syncError: null,
  });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!profileId) return;
      const [pending, lastSyncAt] = await Promise.all([listPendingMutations(profileId), readLastSyncAt(profileId)]);
      if (active) setStatus((current) => ({ ...current, pendingCount: pending.length, lastSyncAt }));
    };
    const onOffline = () => setStatus((current) => ({ ...current, online: false }));
    const onOnline = () => {
      setStatus((current) => ({ ...current, online: true }));
      if (!profileId) return;
      void flushOutbox(profileId).then(async (result) => {
        if (!active) return;
        const pending = await listPendingMutations(profileId);
        const lastSyncAt = await readLastSyncAt(profileId);
        setStatus((current) => ({ ...current, pendingCount: pending.length, lastSyncAt, syncError: result.error ?? null }));
      });
    };
    void refresh();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [profileId]);

  return status;
}
