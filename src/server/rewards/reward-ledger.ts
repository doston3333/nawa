import { Prisma } from "@/generated/prisma/client";
import type { LessonKind } from "@/domain/course/types";
import { db } from "@/server/db";

export type RewardReason = "LESSON_COMPLETED" | "MASTERY_CHECK" | "UNIT_CHECKPOINT" | "REPAIR_SESSION";

export interface RewardGrant {
  profileId: string;
  originKey: string;
  reason: RewardReason;
  xp: number;
  ink?: number;
  occurredAt: Date;
}

export interface RewardSummary {
  xp: number;
  ink: number;
  todayXp: number;
}

function utcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Server-only, origin-keyed grant. Replaying an attempt cannot mint rewards twice. */
export async function grantRewardWithinTransaction(
  tx: Prisma.TransactionClient,
  input: RewardGrant,
): Promise<{ granted: boolean; xp: number; ink: number }> {
  const existing = await tx.rewardLedger.findUnique({
    where: { profileId_originKey: { profileId: input.profileId, originKey: input.originKey } },
  });
  if (existing) return { granted: false, xp: existing.xp, ink: existing.ink };

  const ink = input.ink ?? 0;
  await tx.rewardLedger.create({
    data: {
      profileId: input.profileId,
      originKey: input.originKey,
      reason: input.reason,
      xp: input.xp,
      ink,
      createdAt: input.occurredAt,
    },
  });
  await tx.dailyActivity.upsert({
    where: { profileId_day: { profileId: input.profileId, day: utcDay(input.occurredAt) } },
    update: { xp: { increment: input.xp } },
    create: { profileId: input.profileId, day: utcDay(input.occurredAt), xp: input.xp },
  });
  return { granted: true, xp: input.xp, ink };
}

export function completionReward(lessonKind: LessonKind): Omit<RewardGrant, "profileId" | "originKey" | "occurredAt"> {
  return lessonKind === "CHECKPOINT"
    ? { reason: "UNIT_CHECKPOINT", xp: 50, ink: 2 }
    : { reason: "LESSON_COMPLETED", xp: 10, ink: 0 };
}

export function passesMasteryCheck(correct: number, total: number): boolean {
  return total >= 3 && correct / total >= 0.8;
}

export async function getRewardSummary(profileId: string, now = new Date()): Promise<RewardSummary> {
  const [totals, today] = await Promise.all([
    db.rewardLedger.aggregate({ where: { profileId }, _sum: { xp: true, ink: true } }),
    db.dailyActivity.findUnique({ where: { profileId_day: { profileId, day: utcDay(now) } } }),
  ]);
  return { xp: totals._sum.xp ?? 0, ink: totals._sum.ink ?? 0, todayXp: today?.xp ?? 0 };
}
