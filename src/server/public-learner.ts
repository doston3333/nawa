import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { ensureLearner } from "@/server/repositories/study-repository";

export const LEARNER_COOKIE = "nawa_learner_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPublicDemoEnabled(): boolean {
  return process.env.ENABLE_PUBLIC_DEMO === "true" || process.env.ENABLE_DEMO_LEARNER === "true";
}

export function isLearnerId(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Resolve an isolated public demo learner for this browser.
 * Each visitor gets a stable httpOnly cookie learner id so sessions never collide.
 */
export async function resolvePublicLearnerId(): Promise<string> {
  if (!isPublicDemoEnabled()) {
    throw new Error("Public demo mode is disabled; Plan 2 account authentication is required");
  }

  const jar = await cookies();
  const existing = jar.get(LEARNER_COOKIE)?.value;
  if (isLearnerId(existing)) {
    await ensureLearner(existing);
    return existing;
  }

  const learnerId = randomUUID();
  await ensureLearner(learnerId);
  jar.set(LEARNER_COOKIE, learnerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return learnerId;
}

/** Test and script helper: create a fresh learner without cookies. */
export async function createEphemeralLearnerId(): Promise<string> {
  const learnerId = randomUUID();
  await ensureLearner(learnerId);
  return learnerId;
}
