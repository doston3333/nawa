import { applyEvidence, createInitialSnapshot } from "./apply-evidence";
import type { EvidenceEvent } from "@/domain/learning/types";

const baseEvent: EvidenceEvent = {
  id: "event-1", profileId: "profile-1", atomId: "word-kitab", ability: "WRITING",
  occurredAt: "2026-07-11T10:00:00.000Z", correct: true, responseMode: "TYPE",
  helpLevel: 0, latencyMs: 2200, confidence: 4, novelContext: false, analysisConfidence: null,
};

describe("applyEvidence", () => {
  it("moves unaided production to retrieved", () => {
    const initial = createInitialSnapshot("profile-1", "word-kitab", "WRITING", "2026-07-11T09:00:00.000Z");
    expect(applyEvidence(initial, baseEvent).state).toBe("RETRIEVED");
  });

  it("moves a novel unaided production to applied", () => {
    const initial = createInitialSnapshot("profile-1", "word-kitab", "WRITING", "2026-07-11T09:00:00.000Z");
    expect(applyEvidence(initial, { ...baseEvent, novelContext: true }).state).toBe("APPLIED");
  });

  it("does not penalize low-confidence machine analysis", () => {
    const initial = { ...createInitialSnapshot("profile-1", "word-kitab", "SPEAKING", "2026-07-01T09:00:00.000Z"), state: "APPLIED" as const };
    const result = applyEvidence(initial, { ...baseEvent, ability: "SPEAKING", correct: false, responseMode: "SPEAK", analysisConfidence: 0.4 });
    expect(result).toEqual(initial);
  });

  it("requires delayed repeated retrieval for retained", () => {
    const initial = { ...createInitialSnapshot("profile-1", "word-kitab", "WRITING", "2026-07-01T09:00:00.000Z"), state: "APPLIED" as const, successfulRetrievals: 2, lastSuccessfulRetrievalAt: "2026-07-01T10:00:00.000Z" };
    expect(applyEvidence(initial, baseEvent).state).toBe("RETAINED");
  });
});
