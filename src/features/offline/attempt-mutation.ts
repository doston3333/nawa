import type { EvidenceEvent } from "@/domain/learning/types";
import type { SyncMutationInput } from "@/lib/offline/types";

export const ACTIVE_PROFILE_STORAGE_KEY = "nawa_active_profile_id";
export const ACTIVE_PROFILE_NAME_STORAGE_KEY = "nawa_active_profile_name";

export function readActiveProfileId(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Build the complete, replayable payload used by both lesson and Study Room attempts. */
export function buildAttemptMutation(input: {
  mutationId?: string;
  profileId: string;
  deviceId: string;
  sessionId: string;
  taskId: string;
  nextTaskIndex: number;
  event: EvidenceEvent | null;
  baseRevision?: number | null;
}): SyncMutationInput {
  return {
    mutationId: input.mutationId ?? input.event?.id ?? crypto.randomUUID(),
    profileId: input.profileId,
    deviceId: input.deviceId,
    kind: "STUDY_ATTEMPT",
    baseRevision: input.baseRevision ?? null,
    createdAt: new Date().toISOString(),
    payload: {
      sessionId: input.sessionId,
      taskId: input.taskId,
      nextTaskIndex: input.nextTaskIndex,
      event: input.event,
    },
  };
}

export function isNetworkFailure(reason: unknown): boolean {
  if (typeof reason === "object" && reason !== null && "isHttpError" in reason && reason.isHttpError === true) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return reason instanceof TypeError;
}

export function httpError(message: string, status: number): Error & { isHttpError: true; status: number } {
  return Object.assign(new Error(message), { isHttpError: true as const, status });
}

export function notifyOfflineChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("nawa:offline-change"));
}
