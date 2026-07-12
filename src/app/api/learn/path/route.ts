import { NextResponse } from "next/server";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { getLearnPath } from "@/server/repositories/lesson-repository";
import { logEvent, logLearnerRef } from "@/server/log";

export async function GET() {
  try {
    const profileId = await resolveProfileId();
    const path = await getLearnPath(profileId);
    logEvent("path_loaded", { profile: logLearnerRef(profileId), next: path.nextLessonId });
    return NextResponse.json(path);
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json(
        { error: "Select a profile before loading your learning path", code: error.code },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load path" },
      { status: 503 },
    );
  }
}
