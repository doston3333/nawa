import { NextResponse } from "next/server";
import { resolvePublicProfileId } from "@/server/public-learner";
import { getLearnPath } from "@/server/repositories/lesson-repository";
import { logEvent, logLearnerRef } from "@/server/log";

export async function GET() {
  try {
    const profileId = await resolvePublicProfileId();
    const path = await getLearnPath(profileId);
    logEvent("path_loaded", { profile: logLearnerRef(profileId), next: path.nextLessonId });
    return NextResponse.json(path);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load path" },
      { status: 503 },
    );
  }
}
