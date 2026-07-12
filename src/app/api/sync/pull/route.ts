import { NextResponse } from "next/server";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { pullChanges, SyncInputError } from "@/server/sync";

export async function GET(request: Request) {
  try {
    const profileId = await resolveProfileId();
    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
    return NextResponse.json(await pullChanges({ profileId, cursor }));
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json({ error: "Select a profile before synchronizing", code: error.code }, { status: 400 });
    }
    if (error instanceof SyncInputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to pull sync changes" }, { status: 503 });
  }
}
