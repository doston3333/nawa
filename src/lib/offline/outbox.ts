import type { SyncMutationInput } from "./types";
import { openOfflineDb } from "./indexed-db";
import type { PendingMutation } from "./types";
import { mutationIdentity } from "./mutation-identity";

function comparable(mutation: SyncMutationInput): string { return mutationIdentity(mutation); }
const acknowledgedKey = (mutationId: string) => `acknowledgedMutation:${mutationId}`;

export async function enqueueMutation(mutation: SyncMutationInput): Promise<void> {
  const db = await openOfflineDb();
  // Keep the identity check and write in one readwrite transaction. IndexedDB
  // serializes readwrite transactions across tabs, so another enqueue/ack cannot
  // slip between these reads and the conditional write.
  await atomicTransaction(db, ["outbox", "meta"], (tx, fail) => {
    const outbox = tx.objectStore("outbox");
    const meta = tx.objectStore("meta");
    let existing: PendingMutation | undefined;
    let acknowledged: string | undefined;
    let remaining = 2;
    const maybeFinish = () => {
      remaining -= 1;
      if (remaining !== 0) return;
      if (acknowledged) {
        if (acknowledged !== comparable(mutation)) {
          fail(new Error("Mutation ID is already acknowledged with a different payload"));
          return;
        }
        // Re-enqueueing an identical acknowledged mutation is a safe no-op.
        return;
      }
      if (existing) {
        if (comparable(existing) !== comparable(mutation)) {
          fail(new Error("Mutation ID is already queued with a different payload"));
          return;
        }
        return;
      }
      const pending: PendingMutation = {
        ...mutation,
        attempts: 0,
        lastError: null,
        queuedAt: new Date().toISOString(),
      };
      outbox.put(pending);
    };
    const existingRequest = outbox.get(mutation.mutationId);
    existingRequest.onsuccess = () => {
      existing = existingRequest.result as PendingMutation | undefined;
      maybeFinish();
    };
    existingRequest.onerror = () => fail(existingRequest.error ?? new Error("Unable to read queued mutation"));
    const acknowledgedRequest = meta.get(acknowledgedKey(mutation.mutationId));
    acknowledgedRequest.onsuccess = () => {
      acknowledged = (acknowledgedRequest.result as { value?: string } | undefined)?.value;
      maybeFinish();
    };
    acknowledgedRequest.onerror = () => fail(acknowledgedRequest.error ?? new Error("Unable to inspect acknowledged mutation"));
  });
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
  await atomicTransaction(db, ["outbox", "meta"], (tx, fail) => {
    const outbox = tx.objectStore("outbox");
    const meta = tx.objectStore("meta");
    const pendingRows = new Map<string, PendingMutation | undefined>();
    let remaining = mutationIds.length;
    const maybeFinish = () => {
      remaining -= 1;
      if (remaining !== 0) return;
      for (const mutationId of mutationIds) {
        const pending = pendingRows.get(mutationId);
        if (pending) meta.put({ key: acknowledgedKey(mutationId), value: comparable(pending) });
        outbox.delete(mutationId);
      }
    };
    for (const mutationId of mutationIds) {
      const request = outbox.get(mutationId);
      request.onsuccess = () => {
        pendingRows.set(mutationId, request.result as PendingMutation | undefined);
        maybeFinish();
      };
      request.onerror = () => fail(request.error ?? new Error("Unable to inspect acknowledged mutation"));
    }
  });
}

export async function markMutationFailed(mutationId: string, error: string, details?: unknown): Promise<void> {
  const db = await openOfflineDb();
  await atomicTransaction(db, "outbox", (tx, fail) => {
    const store = tx.objectStore("outbox");
    const request = store.get(mutationId);
    request.onsuccess = () => {
      const pending = request.result as PendingMutation | undefined;
      if (pending) store.put({ ...pending, attempts: pending.attempts + 1, lastError: error, lastErrorDetails: details ?? null });
    };
    request.onerror = () => fail(request.error ?? new Error("Unable to mark queued mutation failed"));
  });
}

type TransactionStore = "outbox" | "meta";

/** Run conditional IndexedDB work and commit it as one readwrite transaction. */
function atomicTransaction(
  db: IDBDatabase,
  stores: TransactionStore | TransactionStore[],
  work: (tx: IDBTransaction, fail: (error: Error) => void) => void,
): Promise<void> {
  const tx = db.transaction(stores, "readwrite");
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      try { tx.abort(); } catch { /* transaction may already be complete */ }
      reject(error);
    };
    tx.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    tx.onerror = () => fail(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => {
      if (!settled) {
        settled = true;
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      }
    };
    try {
      work(tx, fail);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
