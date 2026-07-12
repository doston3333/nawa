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
  // Health is an operational readiness signal. The legacy demo flag is
  // informational only; private named-profile deployments intentionally keep
  // it disabled and must still report healthy when the database is ready.
  const ok = dbOk;
  if (!ok) logEvent("health_degraded", { db: dbOk, demo });

  return NextResponse.json(
    { ok, db: dbOk, demo, service: "nawa" },
    { status: ok ? 200 : 503 },
  );
}
