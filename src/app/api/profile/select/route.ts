import { NextResponse } from "next/server";
import { ProfileSelectionRequiredError, selectProfile } from "@/server/profile";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const profileId =
    typeof body === "object" && body !== null && "profileId" in body && typeof body.profileId === "string"
      ? body.profileId
      : "";
  try {
    await selectProfile(profileId);
    return NextResponse.json({ ok: true, profileId });
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json({ error: "That profile is not available" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to select profile" }, { status: 503 });
  }
}
