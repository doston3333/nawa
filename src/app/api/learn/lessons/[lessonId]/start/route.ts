import { NextResponse } from "next/server";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { startLessonSession } from "@/server/repositories/lesson-repository";
import { checkRateLimit, clientIpFromRequest } from "@/server/rate-limit";
import { logEvent, logLearnerRef } from "@/server/log";

export async function POST(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  const ip = clientIpFromRequest(request);
  const limited = checkRateLimit("session_start", ip);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Slow down; try again soon.", code: "RATE_LIMITED", retryAfterSec: limited.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const { lessonId } = await context.params;
    const profileId = await resolveProfileId();
    const view = await startLessonSession({
      profileId,
      lessonId,
      now: new Date().toISOString(),
    });
    logEvent("lesson_started", {
      profile: logLearnerRef(profileId),
      lessonId,
      sessionId: view.plan.id,
    });
    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json(
        { error: "Select a profile before starting a lesson", code: error.code },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Unable to start lesson";
    const status = message.includes("locked") ? 403 : message.includes("not found") ? 404 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
