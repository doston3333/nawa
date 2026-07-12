import { openOfflineDb, transactionComplete } from "./indexed-db";
import type { CachedProfile, OfflineChange } from "./types";

type CacheStore = "profiles" | "sessions" | "progress" | "readingPositions";

function profileScoped(record: Record<string, unknown>, profileId: string): Record<string, unknown> {
  return { ...record, profileId };
}

async function putRecord(storeName: CacheStore, record: Record<string, unknown>, profileId: string): Promise<void> {
  const id = typeof record.id === "string" ? record.id : undefined;
  if (!id) throw new Error(`${storeName} cache records require an id`);
  const db = await openOfflineDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(profileScoped(record, profileId));
  await transactionComplete(tx);
}

export function cacheProfile(profileId: string, profile: CachedProfile): Promise<void> {
  return putRecord("profiles", { ...profile, id: profileId }, profileId);
}

export function cacheSession(profileId: string, session: Record<string, unknown>): Promise<void> {
  return putRecord("sessions", session, profileId);
}

export function cacheProgress(profileId: string, progress: Record<string, unknown>): Promise<void> {
  return putRecord("progress", progress, profileId);
}

export function cacheReadingPosition(profileId: string, position: Record<string, unknown>): Promise<void> {
  return putRecord("readingPositions", position, profileId);
}

export async function readCachedProfile(profileId: string): Promise<CachedProfile | undefined> {
  const db = await openOfflineDb();
  const tx = db.transaction("profiles", "readonly");
  return await new Promise<CachedProfile | undefined>((resolve, reject) => {
    const request = tx.objectStore("profiles").get(profileId);
    request.onsuccess = () => resolve(request.result as CachedProfile | undefined);
    request.onerror = () => reject(request.error ?? new Error("Unable to read cached profile"));
  });
}

function targetStore(entityType: string): CacheStore | undefined {
  switch (entityType) {
    case "PROFILE": return "profiles";
    case "STUDY_SESSION": return "sessions";
    case "LESSON_PROGRESS": return "progress";
    case "READING_POSITION": return "readingPositions";
    default: return undefined;
  }
}

export async function applyServerChange(profileId: string, change: Omit<OfflineChange, "profileId">): Promise<void> {
  const db = await openOfflineDb();
  const existing = await new Promise<OfflineChange | undefined>((resolve, reject) => {
    const request = db.transaction("changes", "readonly").objectStore("changes").get(change.id);
    request.onsuccess = () => resolve(request.result as OfflineChange | undefined);
    request.onerror = () => reject(request.error ?? new Error("Unable to inspect server change"));
  });
  if (existing) return;
  const storeNames: CacheStore[] = ["profiles", "sessions", "progress", "readingPositions"];
  const tx = db.transaction(["changes", ...storeNames], "readwrite");
  const changes = tx.objectStore("changes");
  const fullChange: OfflineChange = { ...change, profileId };
  changes.put(fullChange);
  const target = targetStore(change.entityType);
  const targetObjectStore = target ? tx.objectStore(target) : undefined;
  if (targetObjectStore) {
    if (change.operation === "DELETE") {
      targetObjectStore.delete(change.entityId);
    } else if (change.payload && typeof change.payload === "object" && !Array.isArray(change.payload)) {
      targetObjectStore.put({ ...(change.payload as Record<string, unknown>), id: change.entityId, profileId });
    }
  }
  await transactionComplete(tx);
}

export async function listCachedChanges(profileId: string): Promise<OfflineChange[]> {
  const db = await openOfflineDb();
  const tx = db.transaction("changes", "readonly");
  return new Promise<OfflineChange[]>((resolve, reject) => {
    const request = tx.objectStore("changes").index("profileId").getAll(profileId);
    request.onsuccess = () => resolve((request.result as OfflineChange[]).sort((a, b) => compareChangeIds(a.id, b.id)));
    request.onerror = () => reject(request.error ?? new Error("Unable to list cached changes"));
  });
}

function compareChangeIds(left: string, right: string): number {
  const a = left.replace(/^0+(?=\d)/, "");
  const b = right.replace(/^0+(?=\d)/, "");
  return a.length === b.length ? a.localeCompare(b) : a.length - b.length;
}
