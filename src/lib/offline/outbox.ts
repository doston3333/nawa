import type { SyncMutationInput } from "./types";
import { openOfflineDb, transactionComplete } from "./indexed-db";
import type { PendingMutation } from "./types";
import { mutationIdentity } from "./mutation-identity";

function comparable(mutation: SyncMutationInput): string { return mutationIdentity(mutation); }
const acknowledgedKey = (mutationId: string) => `acknowledgedMutation:${mutationId}`;

export async function enqueueMutation(mutation: SyncMutationInput): Promise<void> {
  const db = await openOfflineDb();
  const readTx = db.transaction(["outbox", "meta"], "readonly");
  const [existing, acknowledged] = await Promise.all([
    new Promise<PendingMutation | undefined>((resolve, reject) => {
      const request = readTx.objectStore("outbox").get(mutation.mutationId);
      request.onsuccess = () => resolve(request.result as PendingMutation | undefined);
      request.onerror = () => reject(request.error ?? new Error("Unable to read queued mutation"));
    }),
    new Promise<string | undefined>((resolve, reject) => {
      const request = readTx.objectStore("meta").get(acknowledgedKey(mutation.mutationId));
      request.onsuccess = () => resolve((request.result as { value?: string } | undefined)?.value);
      request.onerror = () => reject(request.error ?? new Error("Unable to inspect acknowledged mutation"));
    }),
  ]);
  if (acknowledged) {
    if (acknowledged !== comparable(mutation)) throw new Error("Mutation ID is already acknowledged with a different payload");
    // Re-enqueueing an identical acknowledged mutation is a safe no-op.
    return;
  }
  if (existing) {
    if (comparable(existing) !== comparable(mutation)) {
      throw new Error("Mutation ID is already queued with a different payload");
    }
  } else {
    const tx = db.transaction("outbox", "readwrite");
    const pending: PendingMutation = {
      ...mutation,
      attempts: 0,
      lastError: null,
      queuedAt: new Date().toISOString(),
    };
    tx.objectStore("outbox").put(pending);
    await transactionComplete(tx);
  }
}

export async function listPendingMutations(profileId: string, limit?: number): Promise<PendingMutation[]> {
  const db = await openOfflineDb();
  const tx = db.transaction("outbox", "readonly");
  const request = tx.objectStore("outbox").index("profileId").getAll(profileId);
  const rows = (await new Promise<PendingMutation[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as PendingMutation[]);
    request.onerror = () => reject(request.error ?? new Error("Unable to list queued mutations"));
  }));
  const sorted = rows.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  return limit === undefined ? sorted : sorted.slice(0, Math.max(0, limit));
}

export async function acknowledgeMutations(mutationIds: string[]): Promise<void> {
  if (!mutationIds.length) return;
  const db = await openOfflineDb();
  const readTx = db.transaction("outbox", "readonly");
  const pendingRows = await Promise.all(mutationIds.map((mutationId) => new Promise<PendingMutation | undefined>((resolve, reject) => {
    const request = readTx.objectStore("outbox").get(mutationId);
    request.onsuccess = () => resolve(request.result as PendingMutation | undefined);
    request.onerror = () => reject(request.error ?? new Error("Unable to inspect acknowledged mutation"));
  })));
  const tx = db.transaction(["outbox", "meta"], "readwrite");
  const store = tx.objectStore("outbox");
  const meta = tx.objectStore("meta");
  mutationIds.forEach((mutationId, index) => {
    const pending = pendingRows[index];
    if (pending) meta.put({ key: acknowledgedKey(mutationId), value: comparable(pending) });
    store.delete(mutationId);
  });
  await transactionComplete(tx);
}

export async function markMutationFailed(mutationId: string, error: string, details?: unknown): Promise<void> {
  const db = await openOfflineDb();
  const readTx = db.transaction("outbox", "readonly");
  const pending = await new Promise<PendingMutation | undefined>((resolve, reject) => {
    const request = readTx.objectStore("outbox").get(mutationId);
    request.onsuccess = () => resolve(request.result as PendingMutation | undefined);
    request.onerror = () => reject(request.error ?? new Error("Unable to mark queued mutation failed"));
  });
  if (!pending) return;
  const tx = db.transaction("outbox", "readwrite");
  const store = tx.objectStore("outbox");
  store.put({ ...pending, attempts: pending.attempts + 1, lastError: error, lastErrorDetails: details ?? null });
  await transactionComplete(tx);
}
