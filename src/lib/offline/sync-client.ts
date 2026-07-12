import { acknowledgeMutations, listPendingMutations, markMutationFailed } from "./outbox";
import { applyServerChange } from "./profile-cache";
import { readMeta, writeMeta } from "./indexed-db";
import type { FlushResult, PullResult, SyncPullResult } from "./types";

const deviceKey = (profileId: string) => `deviceId:${profileId}`;
const cursorKey = (profileId: string) => `cursor:${profileId}`;
const lastSyncKey = (profileId: string) => `lastSyncAt:${profileId}`;

function makeDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  throw new Error("Secure random UUID generation is unavailable");
}

export async function getDeviceId(profileId: string): Promise<string> {
  const existing = await readMeta<string>(deviceKey(profileId));
  if (existing) return existing;
  const created = makeDeviceId();
  await writeMeta(deviceKey(profileId), created);
  return created;
}

export async function registerDevice(profileId: string, deviceId?: string): Promise<void> {
  const registeredDeviceId = deviceId ?? await getDeviceId(profileId);
  const response = await fetch("/api/sync/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: registeredDeviceId, label: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "Browser" }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Device registration failed (${response.status})`);
  }
}

export async function flushOutbox(profileId: string): Promise<FlushResult> {
  const pending = await listPendingMutations(profileId, 50);
  if (!pending.length) return { pushed: 0, acknowledged: 0, conflicts: 0, rejected: 0 };
  try {
    const deviceId = await getDeviceId(profileId);
    await registerDevice(profileId, deviceId);
    const response = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId, mutations: pending }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error || `Sync push failed (${response.status})`);
    }
    const result = await response.json() as { acknowledgements?: Array<{ mutationId: string; status: string; conflict?: unknown; result?: unknown }>; cursor?: string };
    const acknowledgements = result.acknowledgements ?? [];
    const acknowledged = acknowledgements.filter((ack) => ack.status === "ACKNOWLEDGED");
    const conflicts = acknowledgements.filter((ack) => ack.status === "CONFLICT");
    const rejected = acknowledgements.filter((ack) => ack.status === "REJECTED");
    await acknowledgeMutations(acknowledged.map((ack) => ack.mutationId));
    for (const ack of [...conflicts, ...rejected]) {
      await markMutationFailed(ack.mutationId, ack.status === "CONFLICT" ? "conflict" : "rejected");
    }
    if (result.cursor) await writeMeta(cursorKey(profileId), result.cursor);
    await writeMeta(lastSyncKey(profileId), new Date().toISOString());
    return { pushed: pending.length, acknowledged: acknowledged.length, conflicts: conflicts.length, rejected: rejected.length, cursor: result.cursor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to synchronize";
    for (const mutation of pending) await markMutationFailed(mutation.mutationId, message);
    return { pushed: 0, acknowledged: 0, conflicts: 0, rejected: 0, error: message };
  }
}

export async function pullProfileChanges(profileId: string): Promise<PullResult> {
  const cursor = (await readMeta<string>(cursorKey(profileId))) ?? "MA";
  const response = await fetch(`/api/sync/pull?cursor=${encodeURIComponent(cursor)}`, { method: "GET" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Sync pull failed (${response.status})`);
  }
  const result = await response.json() as SyncPullResult;
  const changes = [...(result.changes ?? [])].sort((a, b) => Number(a.id) - Number(b.id));
  for (const change of changes) await applyServerChange(profileId, change);
  await writeMeta(cursorKey(profileId), result.cursor);
  await writeMeta(lastSyncKey(profileId), new Date().toISOString());
  return { cursor: result.cursor, hasMore: Boolean(result.hasMore), applied: changes.length };
}

export async function readLastSyncAt(profileId: string): Promise<string | null> {
  return (await readMeta<string>(lastSyncKey(profileId))) ?? null;
}

export async function readSyncCursor(profileId: string): Promise<string> {
  return (await readMeta<string>(cursorKey(profileId))) ?? "MA";
}
