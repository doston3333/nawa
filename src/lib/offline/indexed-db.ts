export const DB_NAME = "nawa-offline-v1";
export const DB_VERSION = 1;

export const OFFLINE_STORES = [
  "meta",
  "profiles",
  "sessions",
  "progress",
  "readingPositions",
  "outbox",
  "changes",
] as const;

export type OfflineStoreName = (typeof OFFLINE_STORES)[number];

let databasePromise: Promise<IDBDatabase> | undefined;

function assertBrowser(): void {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is unavailable in this environment");
}

export function openOfflineDb(): Promise<IDBDatabase> {
  assertBrowser();
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const upgrade = request.transaction;
      const ensureStore = (name: OfflineStoreName, options: IDBObjectStoreParameters) =>
        db.objectStoreNames.contains(name) ? upgrade!.objectStore(name) : db.createObjectStore(name, options);
      ensureStore("meta", { keyPath: "key" });
      ensureStore("profiles", { keyPath: "id" });
      const sessions = ensureStore("sessions", { keyPath: "id" });
      if (sessions && !sessions.indexNames.contains("profileId")) sessions.createIndex("profileId", "profileId");
      const progress = ensureStore("progress", { keyPath: "id" });
      if (progress && !progress.indexNames.contains("profileId")) progress.createIndex("profileId", "profileId");
      const readingPositions = ensureStore("readingPositions", { keyPath: "id" });
      if (readingPositions && !readingPositions.indexNames.contains("profileId")) readingPositions.createIndex("profileId", "profileId");
      const outbox = ensureStore("outbox", { keyPath: "mutationId" });
      if (outbox && !outbox.indexNames.contains("profileId")) outbox.createIndex("profileId", "profileId");
      if (outbox && !outbox.indexNames.contains("queuedAt")) outbox.createIndex("queuedAt", "queuedAt");
      const changes = ensureStore("changes", { keyPath: "id" });
      if (changes && !changes.indexNames.contains("profileId")) changes.createIndex("profileId", "profileId");
      if (changes && !changes.indexNames.contains("id")) changes.createIndex("id", "id");
    };
    request.onsuccess = () => {
      request.result.onclose = () => {
        databasePromise = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error ?? new Error("Unable to open offline database"));
    };
    request.onblocked = () => reject(new Error("Offline database upgrade is blocked"));
  });
  return databasePromise;
}

/** Close the shared handle (used by tests and explicit profile reset flows). */
export async function closeOfflineDb(): Promise<void> {
  const db = await databasePromise;
  if (db) db.close();
  databasePromise = undefined;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function readMeta<T>(key: string): Promise<T | undefined> {
  const db = await openOfflineDb();
  const tx = db.transaction("meta", "readonly");
  const row = (await requestResult(tx.objectStore("meta").get(key))) as { value: T } | undefined;
  return row?.value;
}

export async function writeMeta<T>(key: string, value: T): Promise<void> {
  const db = await openOfflineDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put({ key, value });
  await transactionComplete(tx);
}

export function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function readMetaValue<T>(key: string): Promise<T | undefined> {
  return readMeta<T>(key);
}
