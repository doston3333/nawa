import type { SyncMutationInput } from "./types";
import { openOfflineDb, transactionComplete } from "./indexed-db";
import type { PendingMutation } from "./types";

function comparable(mutation: SyncMutationInput): string {
  return JSON.stringify({
    mutationId: mutation.mutationId,
    profileId: mutation.profileId,
    deviceId: mutation.deviceId,
    kind: mutation.kind,
    baseRevision: mutation.baseRevision,
    createdAt: mutation.createdAt,
    payload: mutation.payload,
  });
}

export async function enqueueMutation(mutation: SyncMutationInput): Promise<void> {
  const db = await openOfflineDb();
  const tx = db.transaction("outbox", "readwrite");
  const store = tx.objectStore("outbox");
  const existing = (await new Promise<PendingMutation | undefined>((resolve, reject) => {
    const request = store.get(mutation.mutationId);
    request.onsuccess = () => resolve(request.result as PendingMutation | undefined);
    request.onerror = () => reject(request.error ?? new Error("Unable to read queued mutation"));
  }));
  if (existing) {
    if (comparable(existing) !== comparable(mutation)) {
      tx.abort();
      throw new Error("Mutation ID is already queued with a different payload");
    }
  } else {
    const pending: PendingMutation = {
      ...mutation,
      attempts: 0,
      lastError: null,
      queuedAt: new Date().toISOString(),
    };
    store.put(pending);
  }
  await transactionComplete(tx);
}

export async function listPendingMutations(profileId: string, limit = 50): Promise<PendingMutation[]> {
  const db = await openOfflineDb();
  const tx = db.transaction("outbox", "readonly");
  const request = tx.objectStore("outbox").index("profileId").getAll(profileId);
  const rows = (await new Promise<PendingMutation[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as PendingMutation[]);
    request.onerror = () => reject(request.error ?? new Error("Unable to list queued mutations"));
  }));
  return rows.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)).slice(0, Math.max(0, limit));
}

export async function acknowledgeMutations(mutationIds: string[]): Promise<void> {
  if (!mutationIds.length) return;
  const db = await openOfflineDb();
  const tx = db.transaction("outbox", "readwrite");
  const store = tx.objectStore("outbox");
  for (const mutationId of mutationIds) store.delete(mutationId);
  await transactionComplete(tx);
}

export async function markMutationFailed(mutationId: string, error: string): Promise<void> {
  const db = await openOfflineDb();
  const tx = db.transaction("outbox", "readwrite");
  const store = tx.objectStore("outbox");
  const request = store.get(mutationId);
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => {
      const pending = request.result as PendingMutation | undefined;
      if (pending) store.put({ ...pending, attempts: pending.attempts + 1, lastError: error });
      resolve();
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to mark queued mutation failed"));
  });
  await transactionComplete(tx);
}
