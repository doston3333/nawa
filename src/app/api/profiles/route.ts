import { NextResponse } from "next/server";
import { createProfile, listProfiles } from "@/server/profile";

export async function GET() {
  return NextResponse.json({ profiles: await listProfiles() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const name =
    typeof body === "object" && body !== null && "name" in body && typeof body.name === "string"
      ? body.name.trim()
      : "";
  if (!name) {
    return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Profile name must be 80 characters or fewer" }, { status: 400 });
  }

  try {
    const profile = await createProfile(name);
    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create profile" },
      { status: 400 },
    );
  }
}
