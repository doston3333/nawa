import type { Ability, EvidenceEvent, MasterySnapshot, MasteryState } from "@/domain/learning/types";

const DAY_MS = 86_400_000;

export function createInitialSnapshot(
  profileId: string,
  atomId: string,
  ability: Ability,
  now: string,
): MasterySnapshot {
  return { profileId, atomId, ability, state: "ENCOUNTERED", successfulRetrievals: 0, lastAttemptAt: null, lastSuccessfulRetrievalAt: null, nextReviewAt: now };
}

function nextReview(occurredAt: string, successfulRetrievals: number): string {
  const gaps = [1, 2, 4, 7, 14, 30];
  const days = gaps[Math.min(successfulRetrievals, gaps.length - 1)];
  return new Date(Date.parse(occurredAt) + days * DAY_MS).toISOString();
}

export function applyEvidence(snapshot: MasterySnapshot, event: EvidenceEvent): MasterySnapshot {
  if (snapshot.profileId !== event.profileId || snapshot.atomId !== event.atomId || snapshot.ability !== event.ability) {
    throw new Error("Evidence does not match mastery snapshot");
  }
  if (event.analysisConfidence !== null && event.analysisConfidence < 0.7) return snapshot;

  if (!event.correct) {
    return { ...snapshot, lastAttemptAt: event.occurredAt, nextReviewAt: event.occurredAt };
  }

  const unaidedProduction = event.helpLevel === 0 && ["TYPE", "SPEAK", "WRITE"].includes(event.responseMode);
  const successfulRetrievals = snapshot.successfulRetrievals + (unaidedProduction ? 1 : 0);
  const delayedDays = snapshot.lastSuccessfulRetrievalAt
    ? (Date.parse(event.occurredAt) - Date.parse(snapshot.lastSuccessfulRetrievalAt)) / DAY_MS
    : 0;
  let state: MasteryState = snapshot.state === "ENCOUNTERED" ? "RECOGNIZED" : snapshot.state;
  if (unaidedProduction) state = event.novelContext ? "APPLIED" : "RETRIEVED";
  if (successfulRetrievals >= 3 && delayedDays >= 7) state = "RETAINED";

  return {
    ...snapshot,
    state,
    successfulRetrievals,
    lastAttemptAt: event.occurredAt,
    lastSuccessfulRetrievalAt: unaidedProduction ? event.occurredAt : snapshot.lastSuccessfulRetrievalAt,
    nextReviewAt: nextReview(event.occurredAt, successfulRetrievals),
  };
}
