import type {
  KnowledgeAtom,
  MasterySnapshot,
  SessionPlan,
  SessionStage,
  SessionTask,
} from "@/domain/learning/types";
import { INPUT_PASSAGES } from "@/domain/curriculum/passages";
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

function isSolid(state: MasterySnapshot["state"]): boolean {
  return state === "RETRIEVED" || state === "APPLIED" || state === "RETAINED";
}

function solidIds(mastery: MasterySnapshot[]): Set<string> {
  return new Set(mastery.filter((item) => isSolid(item.state)).map((item) => item.atomId));
}

function pickUnlocked(atoms: KnowledgeAtom[], mastery: MasterySnapshot[]): KnowledgeAtom {
  const solid = solidIds(mastery);
  const letterSolid = atoms.filter((a) => a.kind === "LETTER" && solid.has(a.id)).length;
  const candidates = atoms.filter((atom) =>
    atom.prerequisiteIds.every((id) => solid.has(id)),
  );

  const preferContent = letterSolid >= 8 || [...solid].some((id) => {
    const atom = atoms.find((a) => a.id === id);
    return atom && atom.kind !== "LETTER";
  });

  const freshContent = candidates.find(
    (atom) =>
      (atom.kind === "WORD" || atom.kind === "CONSTRUCTION" || atom.kind === "GRAMMAR") &&
      !solid.has(atom.id),
  );
  if (preferContent && freshContent) return freshContent;

  const freshAny = candidates.find((atom) => !solid.has(atom.id));
  return freshAny ?? candidates[0] ?? atoms[0];
}

function pickArrivalAtom(
  atoms: KnowledgeAtom[],
  mastery: MasterySnapshot[],
  unlocked: KnowledgeAtom,
): KnowledgeAtom {
  const solid = solidIds(mastery);
  const known = atoms.find(
    (atom) => solid.has(atom.id) && (atom.kind === "WORD" || atom.kind === "CONSTRUCTION"),
  );
  return known ?? unlocked;
}

function earlyWords(atoms: KnowledgeAtom[]): KnowledgeAtom[] {
  return atoms.filter(
    (atom) =>
      (atom.kind === "WORD" || atom.kind === "CONSTRUCTION") &&
      atom.prerequisiteIds.length <= 4,
  );
}

function pickRetrievalTarget(
  atoms: KnowledgeAtom[],
  mastery: MasterySnapshot[],
  due: MasterySnapshot[],
  unlocked: KnowledgeAtom,
): { atomIds: string[]; promptArabic: string | null; expectedAnswer: string | null; prompt: string } {
  if (due.length > 0) {
    const targets = due
      .map((item) => atoms.find((atom) => atom.id === item.atomId))
      .filter((atom): atom is KnowledgeAtom => Boolean(atom))
      .slice(0, 3);
    const first = targets[0] ?? unlocked;
    const glossList = targets.map((t) => t.englishGloss).join("; ");
    return {
      atomIds: targets.map((t) => t.id),
      prompt:
        targets.length > 1
          ? `Produce Arabic for: ${glossList}.`
          : `Write the Arabic for “${first.englishGloss}” before using help.`,
      promptArabic: null,
      expectedAnswer: first.canonicalArabic,
    };
  }

  const pool = earlyWords(atoms);
  const pick = pool[Math.abs(hash(unlocked.id)) % Math.max(pool.length, 1)] ?? unlocked;
  const second = pool[(pool.indexOf(pick) + 3) % pool.length];
  const batch = second && second.id !== pick.id ? [pick, second] : [pick];
  return {
    atomIds: batch.map((item) => item.id),
    prompt:
      batch.length > 1
        ? `Write Arabic for “${batch[0].englishGloss}” (then try “${batch[1].englishGloss}”).`
        : `Write the Arabic for “${pick.englishGloss}” before using help.`,
    promptArabic: null,
    expectedAnswer: pick.canonicalArabic,
  };
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}

function pickInputPassage(
  atoms: KnowledgeAtom[],
  mastery: MasterySnapshot[],
  unlocked: KnowledgeAtom,
): (typeof INPUT_PASSAGES)[number] {
  const solid = solidIds(mastery);
  const atomIds = new Set(atoms.map((a) => a.id));

  const scored = INPUT_PASSAGES
    .filter((passage) => passage.atomIds.every((id) => atomIds.has(id)))
    .map((passage) => {
      const known = passage.atomIds.filter((id) => solid.has(id)).length;
      const linked = passage.atomIds.includes(unlocked.id) ? 2 : 0;
      return { passage, score: known + linked };
    })
    .sort((a, b) => b.score - a.score || a.passage.english.localeCompare(b.passage.english));

  // Prefer a passage with some known atoms; otherwise simplest early passage
  const best = scored.find((item) => item.score > 0) ?? scored[scored.length - 1];
  return best?.passage ?? INPUT_PASSAGES[0];
}

function relatedGlosses(atoms: KnowledgeAtom[], unlocked: KnowledgeAtom, solid: Set<string>): string {
  const related = atoms
    .filter(
      (atom) =>
        solid.has(atom.id) &&
        atom.id !== unlocked.id &&
        (atom.kind === "WORD" || atom.kind === "CONSTRUCTION"),
    )
    .slice(0, 2)
    .map((atom) => atom.englishGloss);
  return related.length > 0 ? ` You already know: ${related.join(", ")}.` : "";
}

export function buildSessionPlan(input: BuildSessionPlanInput): SessionPlan {
  const due = rankRetrievalCandidates(input.mastery, input.now, 4);
  const unlocked = pickUnlocked(input.atoms, input.mastery);
  const arrival = pickArrivalAtom(input.atoms, input.mastery, unlocked);
  const retrieval = pickRetrievalTarget(input.atoms, input.mastery, due, unlocked);
  const passage = pickInputPassage(input.atoms, input.mastery, unlocked);
  const solid = solidIds(input.mastery);
  const stageMinutes = durations[input.durationMinutes];
  const related = relatedGlosses(input.atoms, unlocked, solid);

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
      prompt: `Write one Arabic sentence using “${unlocked.englishGloss}” about your own life or study.${related}`,
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
