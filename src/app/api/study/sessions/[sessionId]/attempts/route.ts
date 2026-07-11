import { NextResponse } from "next/server";
import { z } from "zod";
import type { EvidenceEvent } from "@/domain/learning/types";
import { resolvePublicLearnerId } from "@/server/public-learner";
import {
  advanceSession,
  assertSessionOwnedBy,
  getAbilityCounts,
  recordEvidence,
} from "@/server/repositories/study-repository";
import { checkRateLimit } from "@/server/rate-limit";
import { logEvent, logLearnerRef } from "@/server/log";

const eventSchema = z.object({
  id: z.uuid(),
  learnerId: z.uuid(),
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
    const learnerId = await resolvePublicLearnerId();
    const limited = checkRateLimit("attempt", learnerId);
    if (!limited.allowed) {
      logEvent("rate_limited", { bucket: "attempt", learner: logLearnerRef(learnerId) });
      return NextResponse.json(
        {
          error: "Slow down; try again soon.",
          code: "RATE_LIMITED",
          retryAfterSec: limited.retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }

    if (parsed.data.event && parsed.data.event.learnerId !== learnerId) {
      return NextResponse.json(
        { error: "Attempt does not belong to the active learner" },
        { status: 403 },
      );
    }

    const { sessionId } = await context.params;
    await assertSessionOwnedBy(sessionId, learnerId);

    const mastery = parsed.data.event
      ? await recordEvidence({
          sessionId,
          taskId: parsed.data.taskId,
          event: parsed.data.event as EvidenceEvent,
        })
      : null;
    await advanceSession(sessionId, parsed.data.nextTaskIndex, learnerId);
    const counts = await getAbilityCounts(learnerId);

    logEvent("attempt_recorded", {
      learner: logLearnerRef(learnerId),
      sessionId,
      taskId: parsed.data.taskId,
      nextTaskIndex: parsed.data.nextTaskIndex,
      hasEvidence: Boolean(parsed.data.event),
    });

    if (parsed.data.nextTaskIndex >= 6) {
      logEvent("session_completed", {
        learner: logLearnerRef(learnerId),
        sessionId,
      });
    }

    return NextResponse.json({ mastery, counts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record attempt";
    const status = message.includes("does not belong") ? 403 : 503;
    logEvent("attempt_failed", { error: message });
    return NextResponse.json({ error: message }, { status });
  }
}
