import { NextResponse } from "next/server";
import { isPublicDemoEnabled } from "@/server/public-learner";
import { db } from "@/server/db";
import { logEvent } from "@/server/log";

export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const demo = isPublicDemoEnabled();
  const ok = dbOk && demo;
  if (!ok) logEvent("health_degraded", { db: dbOk, demo });

  return NextResponse.json(
    { ok, db: dbOk, demo, service: "nawa" },
    { status: ok ? 200 : 503 },
  );
}
