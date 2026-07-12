import { Prisma } from "@/generated/prisma/client";
import type { EvidenceEvent, SessionPlan } from "@/domain/learning/types";
import { db } from "@/server/db";
import {
  advanceSessionWithinTransaction,
  recordEvidenceWithinTransaction,
} from "@/server/repositories/study-repository";
import {
  completeLessonAfterSessionWithinTransaction,
  recordLessonAttemptScoreWithinTransaction,
} from "@/server/repositories/lesson-repository";

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

function encodeCursor(id: bigint | number | string): string {
  return Buffer.from(String(id), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): bigint {
  if (!cursor) return 0n;
  try {
    const value = Buffer.from(cursor, "base64url").toString("utf8");
    if (!/^\d+$/.test(value)) return 0n;
    return BigInt(value);
  } catch {
    return 0n;
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

async function currentCursor(profileId?: string): Promise<string> {
  const row = await db.syncChange.findFirst({
    where: profileId ? { profileId } : undefined,
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return row ? encodeCursor(row.id) : EMPTY_CURSOR;
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

async function applyMutation(mutation: SyncMutationInput, requestProfileId: string): Promise<Ack> {
  if (mutation.profileId !== requestProfileId) {
    return {
      mutationId: mutation.mutationId,
      status: "REJECTED",
      result: { code: "PROFILE_MISMATCH", error: "Mutation does not belong to the selected profile" },
    };
  }

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.syncMutation.findUnique({ where: { mutationId: mutation.mutationId } });
      if (existing) {
        if (existing.profileId !== mutation.profileId || existing.deviceId !== mutation.deviceId) {
          return {
            mutationId: mutation.mutationId,
            status: "REJECTED",
            result: { code: "MUTATION_OWNERSHIP_MISMATCH", error: "Mutation belongs to another profile or device" },
          } satisfies Ack;
        }
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
    });
  } catch (error) {
    // A concurrent request may have won the mutation UUID race. Replaying it
    // is safe and returns the winner's stable result.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existing = await db.syncMutation.findUnique({ where: { mutationId: mutation.mutationId } });
      if (existing && existing.profileId === mutation.profileId && existing.deviceId === mutation.deviceId) {
        return storedAck(existing);
      }
    }
    const rejected: Ack = {
      mutationId: mutation.mutationId,
      status: "REJECTED",
      result: { code: "MUTATION_REJECTED", error: error instanceof Error ? error.message : "Mutation rejected" },
    };
    // Preserve rejected mutations as deterministic ledger entries. This is a
    // separate transaction because the application transaction above rolled
    // back the attempted operation.
    try {
      const profile = await db.profile.findUnique({ where: { id: mutation.profileId }, select: { id: true } });
      if (profile) {
        const existing = await db.syncMutation.findUnique({ where: { mutationId: mutation.mutationId } });
        if (existing) {
          if (existing.profileId === mutation.profileId && existing.deviceId === mutation.deviceId) return storedAck(existing);
          return rejected;
        }
        await db.syncMutation.create({
          data: {
            mutationId: mutation.mutationId,
            profileId: mutation.profileId,
            deviceId: mutation.deviceId,
            kind: mutation.kind,
            payload: jsonValue(mutation.payload),
            status: "REJECTED",
            result: jsonValue(rejected.result),
            createdAt: new Date(mutation.createdAt),
          },
        });
      }
    } catch {
      // Keep the stable in-memory acknowledgement even if a concurrent retry
      // wins the ledger insert race.
    }
    return rejected;
  }
}

async function applyStudyAttempt(mutation: SyncMutationInput, tx: Prisma.TransactionClient): Promise<unknown> {
  const payload = asRecord(mutation.payload);
  const sessionId = asString(payload.sessionId, "sessionId");
  const taskId = asString(payload.taskId, "taskId");
  const nextTaskIndex = asNonNegativeInt(payload.nextTaskIndex, "nextTaskIndex");
  const event = asRecord(payload.event) as unknown as EvidenceEvent;
  if (event.profileId !== mutation.profileId) throw new Error("Attempt does not belong to the active profile");
  const session = await tx.studySession.findUnique({ where: { id: sessionId } });
  if (!session || session.profileId !== mutation.profileId) throw new Error("Session does not belong to this profile");
  const mastery = await recordEvidenceWithinTransaction({ sessionId, taskId, event }, tx);
  const plan = session.plan as unknown as SessionPlan;
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
  const correct = payload.correct === null ? null : payload.correct;
  if (correct !== null && typeof correct !== "boolean") throw new Error("correct must be boolean or null");
  await recordLessonAttemptScoreWithinTransaction({ profileId: mutation.profileId, lessonId, correct }, tx);
  return await tx.lessonProgress.findUnique({
    where: { profileId_lessonId: { profileId: mutation.profileId, lessonId } },
  });
}

export async function pushMutations(input: { profileId: string; deviceId?: string; mutations: SyncMutationInput[] }): Promise<SyncPushResult> {
  if (input.mutations.length > 50) throw new Error("A sync push may contain at most 50 mutations");
  const acknowledgements: Ack[] = [];
  for (const mutation of input.mutations) acknowledgements.push(await applyMutation(mutation, input.profileId));
  return { acknowledgements, cursor: await currentCursor(input.profileId) };
}

export async function pullChanges(input: { profileId: string; cursor?: string }): Promise<SyncPullResult> {
  const requested = decodeCursor(input.cursor);
  const rows = await db.syncChange.findMany({
    where: { profileId: input.profileId, id: { gt: requested } },
    orderBy: { id: "asc" },
    take: 201,
  });
  const hasMore = rows.length > 200;
  const visible = hasMore ? rows.slice(0, 200) : rows;
  const cursor = visible.length ? encodeCursor(visible[visible.length - 1]!.id) : input.cursor || EMPTY_CURSOR;
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
