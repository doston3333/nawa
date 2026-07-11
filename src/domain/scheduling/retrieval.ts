import type { MasterySnapshot, MasteryState } from "@/domain/learning/types";

const weakness: Record<MasteryState, number> = {
  ENCOUNTERED: 5,
  RECOGNIZED: 4,
  RETRIEVED: 3,
  APPLIED: 2,
  RETAINED: 1,
};

export function rankRetrievalCandidates(
  snapshots: MasterySnapshot[],
  now: string,
  limit: number,
): MasterySnapshot[] {
  const nowMs = Date.parse(now);
  return [...snapshots]
    .map((item) => {
      const overdueDays = Math.max(0, (nowMs - Date.parse(item.nextReviewAt)) / 86_400_000);
      return { item, score: weakness[item.state] * 100 + overdueDays };
    })
    .filter(({ item }) => Date.parse(item.nextReviewAt) <= nowMs)
    .sort((a, b) => b.score - a.score || a.item.atomId.localeCompare(b.item.atomId))
    .slice(0, limit)
    .map(({ item }) => item);
}
