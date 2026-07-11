import type {
  KnowledgeAtom,
  MasterySnapshot,
  SessionPlan,
  SessionStage,
  SessionTask,
} from "@/domain/learning/types";
import { rankRetrievalCandidates } from "@/domain/scheduling/retrieval";

const durations: Record<30 | 45 | 60, Record<SessionStage, number>> = {
  30: { ARRIVAL: 2, RETRIEVAL: 7, NEW_CONCEPT: 6, INPUT: 5, OUTPUT: 7, CLOSE: 3 },
  45: { ARRIVAL: 3, RETRIEVAL: 8, NEW_CONCEPT: 9, INPUT: 9, OUTPUT: 12, CLOSE: 4 },
  60: { ARRIVAL: 3, RETRIEVAL: 10, NEW_CONCEPT: 12, INPUT: 12, OUTPUT: 18, CLOSE: 5 },
};

const INPUT_PASSAGES: Array<{ atomIds: string[]; arabic: string; english: string }> = [
  {
    atomIds: ["phrase-learn-arabic", "word-arabiyya"],
    arabic: "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ كُلَّ صَبَاحٍ.",
    english: "I learn Arabic every morning.",
  },
  {
    atomIds: ["phrase-in-house", "word-bayt"],
    arabic: "الكِتابُ فِي البَيْتِ.",
    english: "The book is in the house.",
  },
  {
    atomIds: ["verb-aktub", "word-kitab"],
    arabic: "أَكْتُبُ كِتاباً فِي المَكْتَبَةِ.",
    english: "I write a book in the library.",
  },
  {
    atomIds: ["word-marhaba", "pronoun-ana"],
    arabic: "مَرْحَباً، أَنا أَتَعَلَّمُ.",
    english: "Hello — I am learning.",
  },
];

export interface BuildSessionPlanInput {
  learnerId: string;
  durationMinutes: 30 | 45 | 60;
  now: string;
  atoms: KnowledgeAtom[];
  mastery: MasterySnapshot[];
}

function isSolid(state: MasterySnapshot["state"]): boolean {
  return state === "RETRIEVED" || state === "APPLIED" || state === "RETAINED";
}

function pickUnlocked(atoms: KnowledgeAtom[], mastery: MasterySnapshot[]): KnowledgeAtom {
  const solid = new Set(
    mastery.filter((item) => isSolid(item.state)).map((item) => item.atomId),
  );
  const candidates = atoms.filter((atom) =>
    atom.prerequisiteIds.every((id) => solid.has(id)),
  );
  // Prefer words/constructions the learner has not yet retrieved
  const fresh = candidates.find(
    (atom) =>
      (atom.kind === "WORD" || atom.kind === "CONSTRUCTION" || atom.kind === "LETTER") &&
      !solid.has(atom.id),
  );
  return fresh ?? candidates[0] ?? atoms[0];
}

function pickArrivalAtom(atoms: KnowledgeAtom[], mastery: MasterySnapshot[], unlocked: KnowledgeAtom): KnowledgeAtom {
  const solidIds = mastery.filter((item) => isSolid(item.state)).map((item) => item.atomId);
  const known = atoms.find((atom) => solidIds.includes(atom.id) && atom.kind !== "LETTER");
  return known ?? unlocked;
}

function pickRetrievalTarget(
  atoms: KnowledgeAtom[],
  mastery: MasterySnapshot[],
  due: MasterySnapshot[],
  unlocked: KnowledgeAtom,
): { atomIds: string[]; promptArabic: string | null; expectedAnswer: string | null; prompt: string } {
  if (due.length > 0) {
    const first = atoms.find((atom) => atom.id === due[0].atomId) ?? unlocked;
    return {
      atomIds: due.map((item) => item.atomId),
      prompt: `Produce the Arabic for: ${first.englishGloss}.`,
      promptArabic: null,
      expectedAnswer: first.canonicalArabic,
    };
  }
  // Cold start: retrieve a concrete early word, not empty recall
  const earlyWord =
    atoms.find((atom) => atom.kind === "WORD" && atom.prerequisiteIds.length <= 2) ?? unlocked;
  return {
    atomIds: [earlyWord.id],
    prompt: `Write the Arabic for “${earlyWord.englishGloss}” before using help.`,
    promptArabic: null,
    expectedAnswer: earlyWord.canonicalArabic,
  };
}

function pickInputPassage(unlocked: KnowledgeAtom): (typeof INPUT_PASSAGES)[number] {
  const match = INPUT_PASSAGES.find((passage) =>
    passage.atomIds.some((id) => id === unlocked.id || unlocked.prerequisiteIds.includes(id)),
  );
  return match ?? INPUT_PASSAGES[0];
}

export function buildSessionPlan(input: BuildSessionPlanInput): SessionPlan {
  const due = rankRetrievalCandidates(input.mastery, input.now, 4);
  const unlocked = pickUnlocked(input.atoms, input.mastery);
  const arrival = pickArrivalAtom(input.atoms, input.mastery, unlocked);
  const retrieval = pickRetrievalTarget(input.atoms, input.mastery, due, unlocked);
  const passage = pickInputPassage(unlocked);
  const stageMinutes = durations[input.durationMinutes];

  const tasks: SessionTask[] = [
    {
      id: "arrival-1",
      stage: "ARRIVAL",
      kind: "CALIBRATION",
      atomIds: [arrival.id],
      prompt: "Read this Arabic form aloud, then set one intention for today’s study.",
      promptArabic: arrival.vocalizedArabic,
      expectedAnswer: null,
      estimatedMinutes: stageMinutes.ARRIVAL,
      inkAtomId: arrival.id,
    },
    {
      id: "retrieval-1",
      stage: "RETRIEVAL",
      kind: "RECALL",
      atomIds: retrieval.atomIds,
      prompt: retrieval.prompt,
      promptArabic: retrieval.promptArabic,
      expectedAnswer: retrieval.expectedAnswer,
      estimatedMinutes: stageMinutes.RETRIEVAL,
      inkAtomId: retrieval.atomIds[0] ?? null,
    },
    {
      id: "concept-1",
      stage: "NEW_CONCEPT",
      kind: "LESSON",
      atomIds: [unlocked.id],
      prompt: `Notice, compare, explain, and use: ${unlocked.englishGloss}.`,
      promptArabic: unlocked.vocalizedArabic,
      expectedAnswer: unlocked.canonicalArabic,
      estimatedMinutes: stageMinutes.NEW_CONCEPT,
      inkAtomId: unlocked.id,
    },
    {
      id: "input-1",
      stage: "INPUT",
      kind: "READ",
      atomIds: passage.atomIds,
      prompt: `Read for meaning (${passage.english}). Tap an Arabic form if you need a micro-lesson. Use the help ladder only when blocked.`,
      promptArabic: passage.arabic,
      expectedAnswer: null,
      estimatedMinutes: stageMinutes.INPUT,
      inkAtomId: passage.atomIds[0] ?? unlocked.id,
    },
    {
      id: "output-1",
      stage: "OUTPUT",
      kind: "PRODUCE",
      atomIds: [unlocked.id],
      prompt: `Write one Arabic sentence using “${unlocked.englishGloss}” about your own life or study.`,
      promptArabic: unlocked.vocalizedArabic,
      expectedAnswer: null,
      estimatedMinutes: stageMinutes.OUTPUT,
      inkAtomId: unlocked.id,
    },
    {
      id: "close-1",
      stage: "CLOSE",
      kind: "JOURNAL",
      atomIds: [unlocked.id],
      prompt: "Write a one-minute Arabic journal line and name what may be forgotten by tomorrow.",
      promptArabic: unlocked.vocalizedArabic,
      expectedAnswer: null,
      estimatedMinutes: stageMinutes.CLOSE,
      inkAtomId: unlocked.id,
    },
  ];

  return {
    id: `session-${input.learnerId}-${input.now}`,
    learnerId: input.learnerId,
    durationMinutes: input.durationMinutes,
    createdAt: input.now,
    tasks,
  };
}
