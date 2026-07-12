import { Prisma } from "@/generated/prisma/client";
import type { EvidenceEvent, SessionPlan } from "@/domain/learning/types";
import { getLessonById } from "@/domain/curriculum/path";
import { db } from "@/server/db";
import {
  advanceSessionWithinTransaction,
  lockKey,
  lockProfileWithinTransaction,
  recordEvidenceWithinTransaction,
} from "@/server/repositories/study-repository";
import {
  completeLessonAfterSessionWithinTransaction,
  recordLessonAttemptScoreWithinTransaction,
} from "@/server/repositories/lesson-repository";
import { stableSerialize } from "@/lib/offline/mutation-identity";

export type SyncMutationKind = "STUDY_ATTEMPT" | "LESSON_PROGRESS";

export interface SyncMutationInput {
  mutationId: string;
  profileId: string;
  deviceId: string;
  kind: SyncMutationKind;
  baseRevision: number | null;
  createdAt: string;
  payload: unknown;
}

export interface SyncPushResult {
  acknowledgements: Array<{
    mutationId: string;
    status: "ACKNOWLEDGED" | "CONFLICT" | "REJECTED";
    result?: unknown;
    conflict?: unknown;
  }>;
  cursor: string;
}

export interface SyncPullResult {
  changes: Array<{
    id: string;
    entityType: string;
    entityId: string;
    operation: string;
    revision: number;
    payload: unknown;
  }>;
  cursor: string;
  hasMore?: boolean;
}

type Ack = SyncPushResult["acknowledgements"][number];

const EMPTY_CURSOR = "MA";

/** Test-only scheduling hook used to exercise cursor/commit interleavings. */
export const syncTestHooks: { beforePushCursor?: () => Promise<void> } = {};

/** Errors raised by the sync contract are safe for callers to expose as 400s. */
export class SyncInputError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SyncInputError";
    this.code = code;
  }
}

function encodeCursor(profileId: string, id: bigint | number | string): string {
  return Buffer.from(`${profileId}:${String(id)}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null | undefined, profileId: string): bigint {
  if (!cursor || cursor === EMPTY_CURSOR) return 0n;
  try {
    const value = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = value.lastIndexOf(":");
    const tokenProfileId = value.slice(0, separator);
    const tokenId = value.slice(separator + 1);
    if (separator <= 0 || tokenProfileId !== profileId || !/^\d+$/.test(tokenId)) {
      throw new SyncInputError("INVALID_CURSOR", "Cursor is invalid or belongs to another profile");
    }
    return BigInt(tokenId);
  } catch (error) {
    if (error instanceof SyncInputError) throw error;
    throw new SyncInputError("INVALID_CURSOR", "Cursor is invalid or belongs to another profile");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Mutation payload must be an object");
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${name} is required`);
  return value;
}

function asNonNegativeInt(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function entityForMutation(mutation: SyncMutationInput): { entityType: string; entityId: string } {
  const payload = asRecord(mutation.payload);
  if (mutation.kind === "STUDY_ATTEMPT") {
    return { entityType: "STUDY_SESSION", entityId: asString(payload.sessionId, "sessionId") };
  }
  return {
    entityType: "LESSON_PROGRESS",
    entityId: `${mutation.profileId}:${asString(payload.lessonId, "lessonId")}`,
  };
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function currentCursor(
  profileId: string | undefined,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<string> {
  const row = await client.syncChange.findFirst({
    where: profileId ? { profileId } : undefined,
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return row ? encodeCursor(profileId ?? "*", row.id) : EMPTY_CURSOR;
}

function storedAck(row: { mutationId: string; status: string; result: unknown }): Ack {
  if (row.status === "CONFLICT") {
    const result = (row.result ?? {}) as Record<string, unknown>;
    return { mutationId: row.mutationId, status: "CONFLICT", conflict: result };
  }
  if (row.status === "REJECTED") {
    return { mutationId: row.mutationId, status: "REJECTED", result: row.result };
  }
  return { mutationId: row.mutationId, status: "ACKNOWLEDGED", result: row.result };
}

function hasReplayIdentityMismatch(
  existing: { profileId: string; deviceId: string; kind: string; payload: unknown },
  incoming: SyncMutationInput,
): boolean {
  return stableSerialize({ profileId: existing.profileId, deviceId: existing.deviceId, kind: existing.kind, payload: existing.payload }) !==
    stableSerialize({ profileId: incoming.profileId, deviceId: incoming.deviceId, kind: incoming.kind, payload: incoming.payload });
}

function replayMismatchAck(mutationId: string): Ack {
  return {
    mutationId,
    status: "REJECTED",
    result: { code: "MUTATION_REPLAY_MISMATCH", error: "Mutation ID was already acknowledged with different mutation data" },
  };
}

async function applyMutationWithinTransaction(
  mutation: SyncMutationInput,
  requestProfileId: string,
  requestDeviceId: string,
  tx: Prisma.TransactionClient,
): Promise<Ack> {
  if (mutation.profileId !== requestProfileId) {
    return {
      mutationId: mutation.mutationId,
      status: "REJECTED",
      result: { code: "PROFILE_MISMATCH", error: "Mutation does not belong to the selected profile" },
    };
  }
  if (mutation.deviceId !== requestDeviceId) {
    return {
      mutationId: mutation.mutationId,
      status: "REJECTED",
      result: { code: "DEVICE_MISMATCH", error: "Mutation does not belong to the selected device" },
    };
  }
  // Serialize the complete profile stream. The push batch holds this lock in
  // its outer transaction, while single-mutation pushes acquire it here.
  await lockProfileWithinTransaction(tx, mutation.profileId);
  const existing = await tx.syncMutation.findUnique({ where: { mutationId: mutation.mutationId } });
  if (existing) {
    if (existing.profileId !== mutation.profileId || existing.deviceId !== mutation.deviceId) {
      return {
        mutationId: mutation.mutationId,
        status: "REJECTED",
        result: { code: "MUTATION_OWNERSHIP_MISMATCH", error: "Mutation belongs to another profile or device" },
      } satisfies Ack;
    }
    if (hasReplayIdentityMismatch(existing, mutation)) return replayMismatchAck(mutation.mutationId);
    return storedAck(existing);
  }

  const profile = await tx.profile.findUnique({ where: { id: mutation.profileId }, select: { id: true } });
  if (!profile) {
    return {
      mutationId: mutation.mutationId,
      status: "REJECTED",
      result: { code: "PROFILE_NOT_FOUND", error: "Profile does not exist" },
    } satisfies Ack;
  }

  const entity = entityForMutation(mutation);
  await lockKey(tx, `sync:${mutation.profileId}:${entity.entityType}:${entity.entityId}`);
  const latest = await tx.syncChange.findFirst({
    where: { profileId: mutation.profileId, entityType: entity.entityType, entityId: entity.entityId },
    orderBy: { revision: "desc" },
    select: { revision: true },
  });
  const latestRevision = latest?.revision ?? 0;
  if (mutation.baseRevision !== null && mutation.baseRevision !== latestRevision) {
    const conflict = {
      code: "BASE_REVISION_MISMATCH",
      entity,
      expectedRevision: latestRevision,
      receivedRevision: mutation.baseRevision,
    };
    await tx.syncMutation.create({
      data: {
        mutationId: mutation.mutationId,
        profileId: mutation.profileId,
        deviceId: mutation.deviceId,
        kind: mutation.kind,
        payload: jsonValue(mutation.payload),
        status: "CONFLICT",
        result: jsonValue(conflict),
        createdAt: new Date(mutation.createdAt),
      },
    });
    return { mutationId: mutation.mutationId, status: "CONFLICT", conflict } satisfies Ack;
  }

  let result: unknown;
  if (mutation.kind === "STUDY_ATTEMPT") {
    result = await applyStudyAttempt(mutation, tx);
  } else if (mutation.kind === "LESSON_PROGRESS") {
    result = await applyLessonProgress(mutation, tx);
  } else {
    throw new Error("Unsupported mutation kind");
  }

  const revision = latestRevision + 1;
  await tx.syncChange.create({
    data: {
      profileId: mutation.profileId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      operation: "UPSERT",
      revision,
      payload: jsonValue(result),
    },
  });
  await tx.syncMutation.create({
    data: {
      mutationId: mutation.mutationId,
      profileId: mutation.profileId,
      deviceId: mutation.deviceId,
      kind: mutation.kind,
      payload: jsonValue(mutation.payload),
      status: "ACKNOWLEDGED",
      result: jsonValue(result),
      createdAt: new Date(mutation.createdAt),
    },
  });
  return { mutationId: mutation.mutationId, status: "ACKNOWLEDGED", result } satisfies Ack;
}

async function applyStudyAttempt(mutation: SyncMutationInput, tx: Prisma.TransactionClient): Promise<unknown> {
  const payload = asRecord(mutation.payload);
  const sessionId = asString(payload.sessionId, "sessionId");
  const taskId = asString(payload.taskId, "taskId");
  const nextTaskIndex = asNonNegativeInt(payload.nextTaskIndex, "nextTaskIndex");
  const session = await tx.studySession.findUnique({ where: { id: sessionId } });
  if (!session || session.profileId !== mutation.profileId) throw new Error("Session does not belong to this profile");
  const plan = session.plan as unknown as SessionPlan;
  const taskIndex = plan.tasks.findIndex((task) => task.id === taskId);
  if (taskIndex < 0) throw new Error("taskId is not part of the stored session plan");
  if (nextTaskIndex > plan.tasks.length) throw new Error("nextTaskIndex is outside the session plan");
  const event = payload.event === null ? null : asRecord(payload.event) as unknown as EvidenceEvent;
  if (!event) {
    const isReplayPosition = nextTaskIndex === session.currentTaskIndex;
    const isNextPosition = nextTaskIndex === session.currentTaskIndex + 1 && taskIndex === session.currentTaskIndex;
    if (!isReplayPosition && !isNextPosition) throw new Error("nextTaskIndex must be the current task or advance exactly one task");
    if (!isReplayPosition) await advanceSessionWithinTransaction(sessionId, nextTaskIndex, mutation.profileId, tx);
    const liveSession = await tx.studySession.findUnique({ where: { id: sessionId }, select: { currentTaskIndex: true, status: true } });
    return {
      mastery: null,
      lesson: null,
      status: liveSession?.status ?? "ACTIVE",
      nextTaskIndex: liveSession?.currentTaskIndex ?? nextTaskIndex,
    };
  }
  if (event.profileId !== mutation.profileId) throw new Error("Attempt does not belong to the active profile");
  const priorEvent = await tx.evidenceEvent.findUnique({ where: { id: event.id }, select: { profileId: true, sessionId: true, taskId: true } });
  const isReplayPosition = Boolean(priorEvent) && nextTaskIndex === session.currentTaskIndex && taskIndex === nextTaskIndex - 1;
  const isNextPosition = nextTaskIndex === session.currentTaskIndex + 1 && taskIndex === session.currentTaskIndex;
  if (!isReplayPosition && !isNextPosition) {
    throw new Error("nextTaskIndex must be the current task or advance exactly one task");
  }
  await lockKey(tx, `mastery:${mutation.profileId}:${event.atomId}:${event.ability}`);
  const mastery = await recordEvidenceWithinTransaction({ sessionId, taskId, event }, tx);
  let lesson: unknown = null;
  if (!mastery.replayed) {
    if (plan.mode === "LESSON" && plan.lessonId) {
      await recordLessonAttemptScoreWithinTransaction({ profileId: mutation.profileId, lessonId: plan.lessonId, correct: event.correct }, tx);
    }
    await advanceSessionWithinTransaction(sessionId, nextTaskIndex, mutation.profileId, tx);
    if (nextTaskIndex >= plan.tasks.length && plan.mode === "LESSON" && plan.lessonId) {
      lesson = await completeLessonAfterSessionWithinTransaction({ profileId: mutation.profileId, lessonId: plan.lessonId }, tx);
    }
  }
  const liveSession = await tx.studySession.findUnique({ where: { id: sessionId }, select: { currentTaskIndex: true, status: true } });
  return {
    mastery,
    lesson,
    status: liveSession?.status ?? "ACTIVE",
    nextTaskIndex: liveSession?.currentTaskIndex ?? nextTaskIndex,
  };
}

async function applyLessonProgress(mutation: SyncMutationInput, tx: Prisma.TransactionClient): Promise<unknown> {
  const payload = asRecord(mutation.payload);
  const lessonId = asString(payload.lessonId, "lessonId");
  const lesson = getLessonById(lessonId);
  if (!lesson) throw new Error("lessonId is not a known curriculum lesson");
  const correct = payload.correct === null ? null : payload.correct;
  if (correct !== null && typeof correct !== "boolean") throw new Error("correct must be boolean or null");
  const status = payload.status;
  if (status !== undefined && status !== "AVAILABLE" && status !== "IN_PROGRESS" && status !== "COMPLETE") {
    throw new Error("status must be AVAILABLE, IN_PROGRESS, or COMPLETE");
  }
  if (status === "COMPLETE" && payload.completedAt !== undefined && payload.completedAt !== null &&
      (typeof payload.completedAt !== "string" || Number.isNaN(Date.parse(payload.completedAt)))) {
    throw new Error("completedAt must be a valid ISO date");
  }
  await recordLessonAttemptScoreWithinTransaction({ profileId: mutation.profileId, lessonId, correct }, tx);
  if (status) {
    if (status === "COMPLETE") {
      await completeLessonAfterSessionWithinTransaction({ profileId: mutation.profileId, lessonId }, tx);
    } else {
      await tx.lessonProgress.upsert({
        where: { profileId_lessonId: { profileId: mutation.profileId, lessonId } },
        update: { status, completedAt: null },
        create: { profileId: mutation.profileId, lessonId, status },
      });
    }
  }
  return await tx.lessonProgress.findUnique({
    where: { profileId_lessonId: { profileId: mutation.profileId, lessonId } },
  });
}

async function persistRejectedWithinTransaction(
  tx: Prisma.TransactionClient,
  mutation: SyncMutationInput,
  rejected: Ack,
): Promise<Ack> {
  const profile = await tx.profile.findUnique({ where: { id: mutation.profileId }, select: { id: true } });
  if (!profile) return rejected;
  const existing = await tx.syncMutation.findUnique({ where: { mutationId: mutation.mutationId } });
  if (existing) {
    if (existing.profileId === mutation.profileId && existing.deviceId === mutation.deviceId) {
      return hasReplayIdentityMismatch(existing, mutation) ? replayMismatchAck(mutation.mutationId) : storedAck(existing);
    }
    return rejected;
  }
  const createdAt = new Date(mutation.createdAt);
  // Keep the original service behavior for malformed timestamps: reject the
  // mutation without allowing a failed ledger insert to abort the batch.
  if (Number.isNaN(createdAt.getTime())) return rejected;
  await tx.$executeRaw`SAVEPOINT nawa_sync_rejected`;
  try {
    await tx.syncMutation.create({
      data: {
        mutationId: mutation.mutationId,
        profileId: mutation.profileId,
        deviceId: mutation.deviceId,
        kind: mutation.kind,
        payload: jsonValue(mutation.payload),
        status: "REJECTED",
        result: jsonValue(rejected.result),
        createdAt,
      },
    });
    await tx.$executeRaw`RELEASE SAVEPOINT nawa_sync_rejected`;
  } catch {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT nawa_sync_rejected`;
    await tx.$executeRaw`RELEASE SAVEPOINT nawa_sync_rejected`;
    const raced = await tx.syncMutation.findUnique({ where: { mutationId: mutation.mutationId } });
    if (raced && raced.profileId === mutation.profileId && raced.deviceId === mutation.deviceId) {
      return hasReplayIdentityMismatch(raced, mutation) ? replayMismatchAck(mutation.mutationId) : storedAck(raced);
    }
  }
  return rejected;
}

export async function pushMutations(input: { profileId: string; deviceId: string; mutations: SyncMutationInput[] }): Promise<SyncPushResult> {
  if (input.mutations.length > 50) throw new Error("A sync push may contain at most 50 mutations");
  if (!input.deviceId) throw new SyncInputError("DEVICE_REQUIRED", "deviceId is required");
  const device = await db.device.findUnique({ where: { id: input.deviceId }, select: { profileId: true } });
  if (!device || device.profileId !== input.profileId) {
    throw new SyncInputError("DEVICE_MISMATCH", "Device does not belong to the selected profile");
  }
  return db.$transaction(async (tx) => {
    // Keep the profile advisory lock until the cursor snapshot is read. A
    // concurrent same-profile push therefore cannot commit a change between
    // the final mutation acknowledgement and this cursor read.
    await lockProfileWithinTransaction(tx, input.profileId);
    const acknowledgements: Ack[] = [];
    for (const mutation of input.mutations) {
      // Each mutation gets a savepoint so a malformed/rejected mutation can be
      // recorded while the rest of the batch remains atomic with the cursor.
      await tx.$executeRaw`SAVEPOINT nawa_sync_mutation`;
      try {
        acknowledgements.push(await applyMutationWithinTransaction(mutation, input.profileId, input.deviceId, tx));
        await tx.$executeRaw`RELEASE SAVEPOINT nawa_sync_mutation`;
      } catch (error) {
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT nawa_sync_mutation`;
        const rejected: Ack = {
          mutationId: mutation.mutationId,
          status: "REJECTED",
          result: { code: "MUTATION_REJECTED", error: error instanceof Error ? error.message : "Mutation rejected" },
        };
        acknowledgements.push(await persistRejectedWithinTransaction(tx, mutation, rejected));
        await tx.$executeRaw`RELEASE SAVEPOINT nawa_sync_mutation`;
      }
    }
    await syncTestHooks.beforePushCursor?.();
    return { acknowledgements, cursor: await currentCursor(input.profileId, tx) };
  });
}

export async function pullChanges(input: { profileId: string; cursor?: string }): Promise<SyncPullResult> {
  const requested = decodeCursor(input.cursor, input.profileId);
  const rows = await db.syncChange.findMany({
    where: { profileId: input.profileId, id: { gt: requested } },
    orderBy: { id: "asc" },
    take: 201,
  });
  const hasMore = rows.length > 200;
  const visible = hasMore ? rows.slice(0, 200) : rows;
  const cursor = visible.length ? encodeCursor(input.profileId, visible[visible.length - 1]!.id) : input.cursor || EMPTY_CURSOR;
  return {
    changes: visible.map((row) => ({
      id: row.id.toString(),
      entityType: row.entityType,
      entityId: row.entityId,
      operation: row.operation,
      revision: row.revision,
      payload: row.payload,
    })),
    cursor,
    hasMore,
  };
}
