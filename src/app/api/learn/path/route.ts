import { NextResponse } from "next/server";
import { resolvePublicLearnerId } from "@/server/public-learner";
import { getLearnPath } from "@/server/repositories/lesson-repository";
import { logEvent, logLearnerRef } from "@/server/log";

export async function GET() {
  try {
    const learnerId = await resolvePublicLearnerId();
    const path = await getLearnPath(learnerId);
    logEvent("path_loaded", { learner: logLearnerRef(learnerId), next: path.nextLessonId });
    return NextResponse.json(path);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load path" },
      { status: 503 },
    );
  }
}
