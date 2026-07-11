import { NextResponse } from "next/server";
import { z } from "zod";
import type { EvidenceEvent } from "@/domain/learning/types";
import { getDemoLearnerId } from "@/server/demo-learner";
import { advanceSession, getAbilityCounts, recordEvidence } from "@/server/repositories/study-repository";

const eventSchema = z.object({
  id: z.uuid(), learnerId: z.uuid(), atomId: z.string().min(1),
  ability: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]),
  occurredAt: z.iso.datetime(), correct: z.boolean(),
  responseMode: z.enum(["SELECT", "TYPE", "SPEAK", "WRITE"]),
  helpLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  latencyMs: z.number().int().nonnegative(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  novelContext: z.boolean(), analysisConfidence: z.number().min(0).max(1).nullable(),
});
const bodySchema = z.object({ taskId: z.string().min(1), nextTaskIndex: z.number().int().nonnegative(), event: eventSchema.nullable() });

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid attempt payload" }, { status: 400 });
  const learnerId = getDemoLearnerId();
  if (parsed.data.event && parsed.data.event.learnerId !== learnerId) {
    return NextResponse.json({ error: "Attempt does not belong to the active learner" }, { status: 403 });
  }
  try {
    const { sessionId } = await context.params;
    const mastery = parsed.data.event
      ? await recordEvidence({ sessionId, taskId: parsed.data.taskId, event: parsed.data.event as EvidenceEvent })
      : null;
    await advanceSession(sessionId, parsed.data.nextTaskIndex);
    const counts = await getAbilityCounts(learnerId);
    return NextResponse.json({ mastery, counts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record attempt" }, { status: 503 });
  }
}
