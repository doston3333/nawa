import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { db } from "@/server/db";
import { completionReward, getRewardSummary, grantRewardWithinTransaction, passesMasteryCheck } from "./reward-ledger";

const profileId = randomUUID();

beforeAll(async () => {
  await db.profile.create({ data: { id: profileId, name: "Reward learner" } });
});

afterAll(async () => {
  await db.profile.delete({ where: { id: profileId } });
  await db.$disconnect();
});

it("grants a completion reward exactly once and rolls it into daily activity", async () => {
  const occurredAt = new Date("2026-07-14T12:00:00.000Z");
  const input = { profileId, originKey: "session:one", ...completionReward("LESSON"), occurredAt };
  const first = await db.$transaction((tx) => grantRewardWithinTransaction(tx, input));
  const replay = await db.$transaction((tx) => grantRewardWithinTransaction(tx, input));

  expect(first).toEqual({ granted: true, xp: 10, ink: 0 });
  expect(replay).toEqual({ granted: false, xp: 10, ink: 0 });
  await expect(getRewardSummary(profileId, occurredAt)).resolves.toEqual({ xp: 10, ink: 0, todayXp: 10 });
});

it("uses the planned checkpoint grant", () => {
  expect(completionReward("CHECKPOINT")).toEqual({ reason: "UNIT_CHECKPOINT", xp: 50, ink: 2 });
});

it("requires a complete 80% final recall set before awarding mastery XP", () => {
  expect(passesMasteryCheck(3, 3)).toBe(true);
  expect(passesMasteryCheck(2, 3)).toBe(false);
  expect(passesMasteryCheck(2, 2)).toBe(false);
});
