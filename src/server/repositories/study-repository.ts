import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { Ability, EvidenceEvent, MasterySnapshot, SessionPlan, StudySessionView } from "@/domain/learning/types";
import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { applyEvidence, createInitialSnapshot } from "@/domain/mastery/apply-evidence";
import { buildSessionPlan } from "@/domain/sessions/build-session-plan";
import { db } from "@/server/db";

export async function startOrResumeSession(input: {
  learnerId: string;
  durationMinutes: 30 | 45 | 60;
  now: string;
}): Promise<StudySessionView> {
  const active = await db.studySession.findFirst({
    where: { learnerId: input.learnerId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
  if (active) return {
    plan: active.plan as unknown as SessionPlan,
    currentTaskIndex: active.currentTaskIndex,
    status: active.status,
  };

  const rows = await db.masterySnapshot.findMany({ where: { learnerId: input.learnerId } });
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
      learnerId: input.learnerId,
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
  return db.$transaction(async (tx) => {
    const existing = await tx.masterySnapshot.findUnique({
      where: { learnerId_atomId_ability: { learnerId: input.event.learnerId, atomId: input.event.atomId, ability: input.event.ability } },
    });
    const initial = existing ? ({
      ...existing,
      lastAttemptAt: existing.lastAttemptAt?.toISOString() ?? null,
      lastSuccessfulRetrievalAt: existing.lastSuccessfulRetrievalAt?.toISOString() ?? null,
      nextReviewAt: existing.nextReviewAt.toISOString(),
    } as MasterySnapshot) : createInitialSnapshot(input.event.learnerId, input.event.atomId, input.event.ability, input.event.occurredAt);
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
      where: { learnerId_atomId_ability: { learnerId: next.learnerId, atomId: next.atomId, ability: next.ability } },
      update: {
        state: next.state, successfulRetrievals: next.successfulRetrievals,
        lastAttemptAt: next.lastAttemptAt ? new Date(next.lastAttemptAt) : null,
        lastSuccessfulRetrievalAt: next.lastSuccessfulRetrievalAt ? new Date(next.lastSuccessfulRetrievalAt) : null,
        nextReviewAt: new Date(next.nextReviewAt),
      },
      create: {
        learnerId: next.learnerId, atomId: next.atomId, ability: next.ability,
        state: next.state, successfulRetrievals: next.successfulRetrievals,
        lastAttemptAt: next.lastAttemptAt ? new Date(next.lastAttemptAt) : null,
        lastSuccessfulRetrievalAt: next.lastSuccessfulRetrievalAt ? new Date(next.lastSuccessfulRetrievalAt) : null,
        nextReviewAt: new Date(next.nextReviewAt),
      },
    });
    return next;
  });
}

export async function advanceSession(sessionId: string, nextTaskIndex: number): Promise<void> {
  const session = await db.studySession.findUniqueOrThrow({ where: { id: sessionId } });
  const plan = session.plan as unknown as SessionPlan;
  await db.studySession.update({
    where: { id: sessionId },
    data: { currentTaskIndex: nextTaskIndex, status: nextTaskIndex >= plan.tasks.length ? "COMPLETE" : "ACTIVE" },
  });
}

export async function getAbilityCounts(learnerId: string): Promise<Record<Ability, number>> {
  const rows = await db.masterySnapshot.groupBy({
    by: ["ability"],
    where: { learnerId, state: { in: ["RETRIEVED", "APPLIED", "RETAINED"] } },
    _count: { _all: true },
  });
  const counts: Record<Ability, number> = { READING: 0, LISTENING: 0, WRITING: 0, SPEAKING: 0 };
  for (const row of rows) counts[row.ability] = row._count._all;
  return counts;
}
