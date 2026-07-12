import { NextResponse } from "next/server";
import { ProfileSelectionRequiredError, resolveProfileId, selectProfile } from "@/server/profile";
import { db } from "@/server/db";
import { logEvent, logLearnerRef } from "@/server/log";
import { randomUUID } from "node:crypto";
import { ensureProfile } from "@/server/repositories/study-repository";

/**
 * Completes/clears active sessions for the current cookie profile and issues a fresh profile cookie.
 */
export async function POST() {
  try {
    let previousId: string | null = null;
    try {
      previousId = await resolveProfileId();
    } catch (error) {
      if (!(error instanceof ProfileSelectionRequiredError)) throw error;
      previousId = null;
    }

    if (previousId) {
      await db.studySession.updateMany({
        where: { profileId: previousId, status: "ACTIVE" },
        data: { status: "COMPLETE" },
      });
      logEvent("session_reset", { profile: logLearnerRef(previousId) });
    }

    const profileId = randomUUID();
    await ensureProfile(profileId);
    await selectProfile(profileId);

    return NextResponse.json({
      ok: true,
      profileId,
      message: "New anonymous notebook started. Prior active sessions were closed.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reset" },
      { status: 503 },
    );
  }
}
