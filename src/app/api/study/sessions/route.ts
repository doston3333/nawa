import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoLearnerId } from "@/server/demo-learner";
import { startOrResumeSession } from "@/server/repositories/study-repository";

const bodySchema = z.object({ durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "durationMinutes must be 30, 45, or 60" }, { status: 400 });
  try {
    const plan = await startOrResumeSession({ learnerId: getDemoLearnerId(), durationMinutes: parsed.data.durationMinutes, now: new Date().toISOString() });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start session" }, { status: 503 });
  }
}
