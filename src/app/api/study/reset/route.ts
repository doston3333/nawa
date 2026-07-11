import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LEARNER_COOKIE, resolvePublicLearnerId } from "@/server/public-learner";
import { db } from "@/server/db";
import { logEvent, logLearnerRef } from "@/server/log";
import { randomUUID } from "node:crypto";
import { ensureLearner } from "@/server/repositories/study-repository";

/**
 * Completes/clears active sessions for the current cookie learner and issues a fresh learner cookie.
 */
export async function POST() {
  try {
    let previousId: string | null = null;
    try {
      previousId = await resolvePublicLearnerId();
    } catch {
      previousId = null;
    }

    if (previousId) {
      await db.studySession.updateMany({
        where: { learnerId: previousId, status: "ACTIVE" },
        data: { status: "COMPLETE" },
      });
      logEvent("session_reset", { learner: logLearnerRef(previousId) });
    }

    const learnerId = randomUUID();
    await ensureLearner(learnerId);
    const jar = await cookies();
    jar.set(LEARNER_COOKIE, learnerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") === true,
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });

    return NextResponse.json({
      ok: true,
      learnerId,
      message: "New anonymous notebook started. Prior active sessions were closed.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reset" },
      { status: 503 },
    );
  }
}
