"use client";

import { useEffect, useState } from "react";
import { listPendingMutations } from "./outbox";
import { readLastSyncAt, synchronizeProfile } from "./sync-client";

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
      try {
        const [pending, lastSyncAt] = await Promise.all([listPendingMutations(profileId), readLastSyncAt(profileId)]);
        if (active) setStatus((current) => ({ ...current, pendingCount: pending.length, lastSyncAt }));
      } catch {
        // IndexedDB is unavailable in server-rendered/test environments; the
        // online session path remains usable without local persistence.
      }
    };
    const onOffline = () => setStatus((current) => ({ ...current, online: false }));
    const onOfflineChange = () => {
      void refresh();
    };
    const onOnline = () => {
      setStatus((current) => ({ ...current, online: true }));
      if (!profileId) return;
      void synchronizeProfile(profileId).then(async (sync) => {
        if (!active) return;
        try {
          const pending = await listPendingMutations(profileId);
          const lastSyncAt = await readLastSyncAt(profileId);
          setStatus((current) => ({ ...current, pendingCount: pending.length, lastSyncAt, syncError: sync.transient ? null : sync.error ?? null }));
        } catch {
          setStatus((current) => ({ ...current, syncError: sync.transient ? null : sync.error ?? null }));
        }
      }).catch((error: unknown) => {
        if (active) setStatus((current) => ({ ...current, syncError: error instanceof Error ? error.message : "Unable to synchronize" }));
      });
    };
    void refresh().then(() => {
      if (profileId && navigator.onLine) {
        onOnline();
      }
    });
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("nawa:offline-change", onOfflineChange);
    return () => {
      active = false;
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("nawa:offline-change", onOfflineChange);
    };
  }, [profileId]);

  return status;
}
