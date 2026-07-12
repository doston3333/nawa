import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { Ability, EvidenceEvent, MasterySnapshot, SessionPlan, StudySessionView } from "@/domain/learning/types";
import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { applyEvidence, createInitialSnapshot } from "@/domain/mastery/apply-evidence";
import { buildSessionPlan } from "@/domain/sessions/build-session-plan";
import { db } from "@/server/db";

export async function ensureProfile(profileId: string): Promise<void> {
  await db.profile.upsert({
    where: { id: profileId },
    update: {},
    create: { id: profileId, name: "Personal profile" },
  });
}

export async function assertSessionOwnedBy(sessionId: string, profileId: string): Promise<SessionPlan> {
  const session = await db.studySession.findUnique({ where: { id: sessionId } });
  if (!session || session.profileId !== profileId) {
    throw new Error("Session does not belong to this profile");
  }
  return session.plan as unknown as SessionPlan;
}

export async function startOrResumeSession(input: {
  profileId: string;
  durationMinutes: 30 | 45 | 60;
  now: string;
}): Promise<StudySessionView> {
  await ensureProfile(input.profileId);

  const active = await db.studySession.findFirst({
    where: { profileId: input.profileId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
  if (active) {
    return {
      plan: active.plan as unknown as SessionPlan,
      currentTaskIndex: active.currentTaskIndex,
      status: active.status,
    };
  }

  const rows = await db.masterySnapshot.findMany({ where: { profileId: input.profileId } });
  const mastery = rows.map((row) => ({
    ...row,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    lastSuccessfulRetrievalAt: row.lastSuccessfulRetrievalAt?.toISOString() ?? null,
    nextReviewAt: row.nextReviewAt.toISOString(),
  })) as MasterySnapshot[];
  const sessionId = randomUUID();
  const draft = buildSessionPlan({ ...input, atoms: BEGINNER_ATOMS, mastery });
  const plan = { ...draft, id: sessionId };
  await db.studySession.create({
    data: {
      id: sessionId,
      profileId: input.profileId,
      durationMinutes: input.durationMinutes,
      plan: plan as unknown as Prisma.InputJsonValue,
      startedAt: new Date(input.now),
    },
  });
  return { plan, currentTaskIndex: 0, status: "ACTIVE" };
}

export async function recordEvidence(input: {
  sessionId: string;
  taskId: string;
  event: EvidenceEvent;
}): Promise<MasterySnapshot> {
  await assertSessionOwnedBy(input.sessionId, input.event.profileId);

  return db.$transaction(async (tx) => recordEvidenceWithinTransaction(input, tx));
}

/** Apply an evidence event using an existing transaction. Sync uses this so
 * the event, mastery transition, and mutation ledger commit atomically. */
export async function recordEvidenceWithinTransaction(
  input: { sessionId: string; taskId: string; event: EvidenceEvent },
  tx: Prisma.TransactionClient,
): Promise<MasterySnapshot & { replayed?: boolean }> {
  const markReplay = (snapshot: MasterySnapshot, replayed: boolean) => {
    Object.defineProperty(snapshot, "replayed", { value: replayed, enumerable: false });
    return snapshot as MasterySnapshot & { replayed?: boolean };
  };
  const prior = await tx.evidenceEvent.findUnique({ where: { id: input.event.id } });
  if (prior) {
    if (
      prior.profileId !== input.event.profileId ||
      prior.sessionId !== input.sessionId ||
      prior.taskId !== input.taskId
    ) {
      throw new Error("Evidence event does not belong to this profile or session");
    }
    const existingSnapshot = await tx.masterySnapshot.findUnique({
      where: {
        profileId_atomId_ability: {
          profileId: prior.profileId,
          atomId: prior.atomId,
          ability: prior.ability,
        },
      },
    });
    if (!existingSnapshot) throw new Error("Evidence event mastery snapshot is missing");
    return markReplay(
      {
        ...existingSnapshot,
        lastAttemptAt: existingSnapshot.lastAttemptAt?.toISOString() ?? null,
        lastSuccessfulRetrievalAt: existingSnapshot.lastSuccessfulRetrievalAt?.toISOString() ?? null,
        nextReviewAt: existingSnapshot.nextReviewAt.toISOString(),
      },
      true,
    );
  }

  const existing = await tx.masterySnapshot.findUnique({
      where: {
        profileId_atomId_ability: {
          profileId: input.event.profileId,
          atomId: input.event.atomId,
          ability: input.event.ability,
        },
      },
    });
  const initial = existing
      ? ({
          ...existing,
          lastAttemptAt: existing.lastAttemptAt?.toISOString() ?? null,
          lastSuccessfulRetrievalAt: existing.lastSuccessfulRetrievalAt?.toISOString() ?? null,
          nextReviewAt: existing.nextReviewAt.toISOString(),
        } as MasterySnapshot)
      : createInitialSnapshot(
          input.event.profileId,
          input.event.atomId,
          input.event.ability,
          input.event.occurredAt,
        );
  const next = applyEvidence(initial, input.event);

  await tx.evidenceEvent.create({
      data: {
        ...input.event,
        sessionId: input.sessionId,
        taskId: input.taskId,
        occurredAt: new Date(input.event.occurredAt),
      },
    });
  await tx.masterySnapshot.upsert({
      where: {
        profileId_atomId_ability: {
          profileId: next.profileId,
          atomId: next.atomId,
          ability: next.ability,
        },
      },
      update: {
        state: next.state,
        successfulRetrievals: next.successfulRetrievals,
        lastAttemptAt: next.lastAttemptAt ? new Date(next.lastAttemptAt) : null,
        lastSuccessfulRetrievalAt: next.lastSuccessfulRetrievalAt
          ? new Date(next.lastSuccessfulRetrievalAt)
          : null,
        nextReviewAt: new Date(next.nextReviewAt),
      },
      create: {
        profileId: next.profileId,
        atomId: next.atomId,
        ability: next.ability,
        state: next.state,
        successfulRetrievals: next.successfulRetrievals,
        lastAttemptAt: next.lastAttemptAt ? new Date(next.lastAttemptAt) : null,
        lastSuccessfulRetrievalAt: next.lastSuccessfulRetrievalAt
          ? new Date(next.lastSuccessfulRetrievalAt)
          : null,
        nextReviewAt: new Date(next.nextReviewAt),
      },
    });
  return markReplay({ ...next }, false);
}

export async function advanceSession(
  sessionId: string,
  nextTaskIndex: number,
  profileId?: string,
  strict = false,
): Promise<void> {
  if (profileId) {
    await assertSessionOwnedBy(sessionId, profileId);
  }
  await db.$transaction((tx) => advanceSessionWithinTransaction(sessionId, nextTaskIndex, profileId, tx, strict));
}

export async function advanceSessionWithinTransaction(
  sessionId: string,
  nextTaskIndex: number,
  profileId: string | undefined,
  tx: Prisma.TransactionClient,
  strict = true,
): Promise<void> {
  const session = await tx.studySession.findUniqueOrThrow({ where: { id: sessionId } });
  if (profileId && session.profileId !== profileId) {
    throw new Error("Session does not belong to this profile");
  }
  const plan = session.plan as unknown as SessionPlan;
  if (strict && nextTaskIndex !== session.currentTaskIndex && nextTaskIndex !== session.currentTaskIndex + 1) {
    throw new Error("nextTaskIndex must advance by exactly one task");
  }
  if (nextTaskIndex === session.currentTaskIndex) return;
  await tx.studySession.update({
    where: { id: sessionId },
    data: {
      currentTaskIndex: nextTaskIndex,
      status: nextTaskIndex >= plan.tasks.length ? "COMPLETE" : "ACTIVE",
    },
  });
}

export async function getAbilityCounts(profileId: string): Promise<Record<Ability, number>> {
  const rows = await db.masterySnapshot.groupBy({
    by: ["ability"],
    where: { profileId, state: { in: ["RETRIEVED", "APPLIED", "RETAINED"] } },
    _count: { _all: true },
  });
  const counts: Record<Ability, number> = { READING: 0, LISTENING: 0, WRITING: 0, SPEAKING: 0 };
  for (const row of rows) counts[row.ability] = row._count._all;
  return counts;
}
