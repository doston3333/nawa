import { rankRetrievalCandidates } from "./retrieval";
import type { MasterySnapshot } from "@/domain/learning/types";

const snapshot = (ability: MasterySnapshot["ability"], state: MasterySnapshot["state"], nextReviewAt: string): MasterySnapshot => ({
  learnerId: "learner-1", atomId: `kitab-${ability}`, ability, state,
  successfulRetrievals: state === "RETAINED" ? 3 : 1,
  lastAttemptAt: "2026-07-01T00:00:00.000Z",
  lastSuccessfulRetrievalAt: "2026-07-01T00:00:00.000Z",
  nextReviewAt,
});

it("ranks overdue weak abilities before retained future abilities", () => {
  const ranked = rankRetrievalCandidates([
    snapshot("READING", "RETAINED", "2026-07-20T00:00:00.000Z"),
    snapshot("SPEAKING", "RECOGNIZED", "2026-07-05T00:00:00.000Z"),
    snapshot("WRITING", "RETRIEVED", "2026-07-10T00:00:00.000Z"),
  ], "2026-07-11T00:00:00.000Z", 2);
  expect(ranked.map((item) => item.ability)).toEqual(["SPEAKING", "WRITING"]);
});
