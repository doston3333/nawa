import type { KnowledgeAtom, MasterySnapshot, SessionPlan, SessionStage, SessionTask } from "@/domain/learning/types";
import { rankRetrievalCandidates } from "@/domain/scheduling/retrieval";

const durations: Record<30 | 45 | 60, Record<SessionStage, number>> = {
  30: { ARRIVAL: 2, RETRIEVAL: 7, NEW_CONCEPT: 6, INPUT: 5, OUTPUT: 7, CLOSE: 3 },
  45: { ARRIVAL: 3, RETRIEVAL: 8, NEW_CONCEPT: 9, INPUT: 9, OUTPUT: 12, CLOSE: 4 },
  60: { ARRIVAL: 3, RETRIEVAL: 10, NEW_CONCEPT: 12, INPUT: 12, OUTPUT: 18, CLOSE: 5 },
};

export interface BuildSessionPlanInput {
  learnerId: string;
  durationMinutes: 30 | 45 | 60;
  now: string;
  atoms: KnowledgeAtom[];
  mastery: MasterySnapshot[];
}

export function buildSessionPlan(input: BuildSessionPlanInput): SessionPlan {
  const due = rankRetrievalCandidates(input.mastery, input.now, 4);
  const unlocked = input.atoms.find((atom) => atom.prerequisiteIds.every((id) => input.mastery.some((item) => item.atomId === id && ["RETRIEVED", "APPLIED", "RETAINED"].includes(item.state)))) ?? input.atoms[0];
  const stageMinutes = durations[input.durationMinutes];
  const tasks: SessionTask[] = [
    { id: "arrival-1", stage: "ARRIVAL", kind: "CALIBRATION", atomIds: [], prompt: "Read one familiar Arabic form aloud, then set your study intention.", promptArabic: "بَ", expectedAnswer: null, estimatedMinutes: stageMinutes.ARRIVAL },
    { id: "retrieval-1", stage: "RETRIEVAL", kind: "RECALL", atomIds: due.map((item) => item.atomId), prompt: "Produce the Arabic before asking for help.", promptArabic: null, expectedAnswer: null, estimatedMinutes: stageMinutes.RETRIEVAL },
    { id: "concept-1", stage: "NEW_CONCEPT", kind: "LESSON", atomIds: [unlocked.id], prompt: `Notice, compare, explain, and use: ${unlocked.englishGloss}.`, promptArabic: unlocked.vocalizedArabic, expectedAnswer: unlocked.canonicalArabic, estimatedMinutes: stageMinutes.NEW_CONCEPT },
    { id: "input-1", stage: "INPUT", kind: "READ", atomIds: [unlocked.id], prompt: "Read for meaning. Use the help ladder only when blocked.", promptArabic: "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ كُلَّ صَبَاحٍ.", expectedAnswer: null, estimatedMinutes: stageMinutes.INPUT },
    { id: "output-1", stage: "OUTPUT", kind: "PRODUCE", atomIds: [unlocked.id], prompt: "Write one new sentence about your own Arabic study.", promptArabic: null, expectedAnswer: null, estimatedMinutes: stageMinutes.OUTPUT },
    { id: "close-1", stage: "CLOSE", kind: "JOURNAL", atomIds: [], prompt: "Write a one-minute Arabic journal entry and name what may be forgotten.", promptArabic: null, expectedAnswer: null, estimatedMinutes: stageMinutes.CLOSE },
  ];
  return { id: `session-${input.learnerId}-${input.now}`, learnerId: input.learnerId, durationMinutes: input.durationMinutes, createdAt: input.now, tasks };
}
