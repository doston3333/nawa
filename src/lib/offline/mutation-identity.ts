import type { SyncMutationInput } from "./types";

/**
 * Deterministically serializes JSON values so mutation identity does not
 * depend on object insertion order (or on a browser/server implementation).
 */
export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
}

export function mutationIdentity(mutation: SyncMutationInput): string {
  return stableSerialize({
    profileId: mutation.profileId,
    deviceId: mutation.deviceId,
    kind: mutation.kind,
    baseRevision: mutation.baseRevision,
    createdAt: mutation.createdAt,
    payload: mutation.payload,
  });
}
