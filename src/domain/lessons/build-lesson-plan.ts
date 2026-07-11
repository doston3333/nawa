import type { KnowledgeAtom, LessonDef, SessionPlan, SessionTask } from "@/domain/learning/types";

export interface BuildLessonPlanInput {
  sessionId: string;
  learnerId: string;
  lesson: LessonDef;
  atoms: KnowledgeAtom[];
  now: string;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.abs(hash(`${i}-${String(copy[i])}`)) % (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}

function distractors(atoms: KnowledgeAtom[], target: KnowledgeAtom, count: number): string[] {
  const pool = atoms
    .filter((atom) => atom.id !== target.id && atom.kind === target.kind)
    .map((atom) => atom.englishGloss);
  const unique = [...new Set(pool)].filter((gloss) => gloss !== target.englishGloss);
  return shuffle(unique).slice(0, count);
}

function arabicDistractors(atoms: KnowledgeAtom[], target: KnowledgeAtom, count: number): string[] {
  const pool = atoms
    .filter((atom) => atom.id !== target.id)
    .map((atom) => atom.canonicalArabic);
  const unique = [...new Set(pool)].filter((form) => form !== target.canonicalArabic);
  return shuffle(unique).slice(0, count);
}

export function buildLessonPlan(input: BuildLessonPlanInput): SessionPlan {
  const byId = new Map(input.atoms.map((atom) => [atom.id, atom]));
  const lessonAtoms = input.lesson.atomIds
    .map((id) => byId.get(id))
    .filter((atom): atom is KnowledgeAtom => Boolean(atom));

  if (lessonAtoms.length === 0) {
    throw new Error(`Lesson ${input.lesson.id} has no valid atoms`);
  }

  const count = Math.max(6, Math.min(input.lesson.exerciseCount, 12));
  const tasks: SessionTask[] = [];

  for (let i = 0; i < count; i += 1) {
    const atom = lessonAtoms[i % lessonAtoms.length];
    const pattern = i % 3;

    if (pattern === 0) {
      // EN → AR select
      const options = shuffle([atom.canonicalArabic, ...arabicDistractors(input.atoms, atom, 3)]).slice(0, 4);
      while (options.length < 2) options.push(atom.canonicalArabic);
      tasks.push({
        id: `ex-${i + 1}`,
        stage: "LESSON",
        kind: "SELECT",
        atomIds: [atom.id],
        prompt: `Choose the Arabic for “${atom.englishGloss}”.`,
        promptArabic: null,
        expectedAnswer: atom.canonicalArabic,
        estimatedMinutes: 1,
        inkAtomId: atom.id,
        choices: options,
        responseMode: "SELECT",
      });
    } else if (pattern === 1) {
      // AR → EN select
      const options = shuffle([atom.englishGloss, ...distractors(input.atoms, atom, 3)]).slice(0, 4);
      while (options.length < 2) options.push(atom.englishGloss);
      tasks.push({
        id: `ex-${i + 1}`,
        stage: "LESSON",
        kind: "SELECT",
        atomIds: [atom.id],
        prompt: "What does this mean?",
        promptArabic: atom.vocalizedArabic,
        expectedAnswer: atom.englishGloss,
        estimatedMinutes: 1,
        inkAtomId: atom.id,
        choices: options,
        responseMode: "SELECT",
      });
    } else {
      // TYPE produce Arabic
      tasks.push({
        id: `ex-${i + 1}`,
        stage: "LESSON",
        kind: "PRODUCE",
        atomIds: [atom.id],
        prompt: `Type the Arabic for “${atom.englishGloss}”.`,
        promptArabic: null,
        expectedAnswer: atom.canonicalArabic,
        estimatedMinutes: 1,
        inkAtomId: atom.id,
        choices: null,
        responseMode: "TYPE",
      });
    }
  }

  return {
    id: input.sessionId,
    learnerId: input.learnerId,
    durationMinutes: 30,
    createdAt: input.now,
    tasks,
    mode: "LESSON",
    lessonId: input.lesson.id,
  };
}
