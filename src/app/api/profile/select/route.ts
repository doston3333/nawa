import { NextResponse } from "next/server";
import { selectProfile } from "@/server/profile";

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
  } catch {
    return NextResponse.json({ error: "That profile is not available" }, { status: 400 });
  }
}
