import { NextResponse } from "next/server";
import { z } from "zod";
import type { EvidenceEvent, SessionPlan } from "@/domain/learning/types";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import {
  advanceSession,
  assertSessionOwnedBy,
  getAbilityCounts,
  recordEvidence,
} from "@/server/repositories/study-repository";
import {
  completeLessonAfterSession,
  recordLessonAttemptScore,
} from "@/server/repositories/lesson-repository";
import { checkRateLimit } from "@/server/rate-limit";
import { logEvent, logLearnerRef } from "@/server/log";
import { db } from "@/server/db";

const eventSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  atomId: z.string().min(1),
  ability: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]),
  occurredAt: z.iso.datetime(),
  correct: z.boolean(),
  responseMode: z.enum(["SELECT", "TYPE", "SPEAK", "WRITE"]),
  helpLevel: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
  ]),
  latencyMs: z.number().int().nonnegative(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  novelContext: z.boolean(),
  analysisConfidence: z.number().min(0).max(1).nullable(),
});
const bodySchema = z.object({
  taskId: z.string().min(1),
  nextTaskIndex: z.number().int().nonnegative(),
  event: eventSchema.nullable(),
});

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attempt payload" }, { status: 400 });
  }

  try {
    const profileId = await resolveProfileId();
    const limited = checkRateLimit("attempt", profileId);
    if (!limited.allowed) {
      logEvent("rate_limited", { bucket: "attempt", profile: logLearnerRef(profileId) });
      return NextResponse.json(
        {
          error: "Slow down; try again soon.",
          code: "RATE_LIMITED",
          retryAfterSec: limited.retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }

    if (parsed.data.event && parsed.data.event.profileId !== profileId) {
      return NextResponse.json(
        { error: "Attempt does not belong to the active profile" },
        { status: 403 },
      );
    }

    const { sessionId } = await context.params;
    const plan = await assertSessionOwnedBy(sessionId, profileId);

    const mastery = parsed.data.event
      ? await recordEvidence({
          sessionId,
          taskId: parsed.data.taskId,
          event: parsed.data.event as EvidenceEvent,
        })
      : null;

    if (plan.mode === "LESSON" && plan.lessonId && parsed.data.event && !(mastery && "replayed" in mastery && mastery.replayed)) {
      await recordLessonAttemptScore({
        profileId,
        lessonId: plan.lessonId,
        correct: parsed.data.event.correct,
      });
    }

    const replayed = Boolean(mastery && "replayed" in mastery && mastery.replayed);
    if (!replayed) {
      await advanceSession(sessionId, parsed.data.nextTaskIndex, profileId);
    }
    const counts = await getAbilityCounts(profileId);

    logEvent("attempt_recorded", {
      profile: logLearnerRef(profileId),
      sessionId,
      taskId: parsed.data.taskId,
      nextTaskIndex: parsed.data.nextTaskIndex,
      hasEvidence: Boolean(parsed.data.event),
      mode: plan.mode ?? "STUDY_ROOM",
    });

    let lesson: { completed: boolean; nextLessonId: string | null; passed?: boolean } | null = null;
    const finished = !replayed && parsed.data.nextTaskIndex >= plan.tasks.length;

    if (finished) {
      logEvent("session_completed", {
        profile: logLearnerRef(profileId),
        sessionId,
        mode: plan.mode ?? "STUDY_ROOM",
      });
      if (plan.mode === "LESSON" && plan.lessonId) {
        lesson = await completeLessonAfterSession({
          profileId,
          lessonId: plan.lessonId,
        });
        logEvent("lesson_completed", {
          profile: logLearnerRef(profileId),
          lessonId: plan.lessonId,
          next: lesson.nextLessonId,
          passed: lesson.passed,
        });
      }
    }

    // Refresh plan status from DB
    const session = await db.studySession.findUnique({ where: { id: sessionId } });
    const livePlan = (session?.plan as unknown as SessionPlan) ?? plan;

    return NextResponse.json({
      mastery,
      counts,
      lesson,
      status: replayed ? (session?.status ?? "ACTIVE") : finished ? "COMPLETE" : "ACTIVE",
      plan: livePlan,
    });
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json(
        { error: "Select a profile before recording an attempt", code: error.code },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Unable to record attempt";
    const status = message.includes("does not belong") ? 403 : 503;
    logEvent("attempt_failed", { error: message });
    return NextResponse.json({ error: message }, { status });
  }
}
