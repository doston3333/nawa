import { NextResponse } from "next/server";
import { z } from "zod";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { startOrResumeSession } from "@/server/repositories/study-repository";
import { checkRateLimit, clientIpFromRequest } from "@/server/rate-limit";
import { logEvent, logLearnerRef } from "@/server/log";

const bodySchema = z.object({
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "durationMinutes must be 30, 45, or 60" }, { status: 400 });
  }

  const ip = clientIpFromRequest(request);
  const limited = checkRateLimit("session_start", ip);
  if (!limited.allowed) {
    logEvent("rate_limited", { bucket: "session_start", ip });
    return NextResponse.json(
      {
        error: "Slow down; try again soon.",
        code: "RATE_LIMITED",
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const profileId = await resolveProfileId();
    const plan = await startOrResumeSession({
      profileId,
      durationMinutes: parsed.data.durationMinutes,
      now: new Date().toISOString(),
    });
    logEvent("session_started", {
      profile: logLearnerRef(profileId),
      sessionId: plan.plan.id,
      durationMinutes: parsed.data.durationMinutes,
      taskIndex: plan.currentTaskIndex,
      status: plan.status,
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json(
        { error: "Select a profile before starting a study session", code: error.code },
        { status: 400 },
      );
    }
    logEvent("session_start_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start session" },
      { status: 503 },
    );
  }
}
