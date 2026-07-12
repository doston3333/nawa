import type {
  AcceptedAnswerPolicy,
  CourseLevel,
  CourseUnit,
  ExerciseDefinition,
  LessonDefinition,
  LessonStep,
  SkillDefinition,
  StepKind,
} from "./types";
import { validateCourseCatalog } from "./validate";

export * from "./types";
export { validateCourseCatalog } from "./validate";

const UNIT_SPECS = [
  ["rtl-baseline", "RTL and baseline", "Read and write from right to left", "ا"],
  ["letter-families-i", "Letter families I", "Recognize shared letter shapes", "ب ت ث"],
  ["letter-families-ii", "Letter families II", "Distinguish more dot patterns", "ج ح خ"],
  ["connections", "Connections", "Join Arabic letters correctly", "بـ ـبـ ـب"],
  ["short-vowels-sukun", "Short vowels and sukun", "Decode short vowel marks", "بَ بِ بُ بْ"],
  ["long-vowels-shadda-tanwin", "Long vowels, shadda and tanwin", "Read common sound marks", "بَا بِي بُو"],
  ["special-orthography", "Special orthography", "Recognize frequent special forms", "ة ى ء"],
  ["decoding-first-phrases", "Decoding and first phrases", "Read and write first MSA phrases", "بَيْتٌ كَبِيرٌ"],
] as const;

const VARIANTS: readonly StepKind[] = [
  "TEACHING", "COMPARISON", "MATCHING", "SORTING", "WORD_TILES", "SENTENCE_ORDERING",
  "COMPLETION", "TYPING", "CORRECTION", "COMPREHENSION", "COMPOSITION", "HANDWRITING",
];

function exercise(id: string, prompt: string, answer: string, policy: AcceptedAnswerPolicy = "NORMALIZED_ARABIC"): ExerciseDefinition {
  const choices = [answer, "ا", "ب", "ت", "ث"]
    .filter((choice, index, all) => all.indexOf(choice) === index)
    .slice(0, 4);
  return { id, prompt, choices, acceptedAnswer: { policy, values: [answer] } };
}

function step(unitId: string, lessonOrder: number, stepOrder: number, arabic: string): LessonStep {
  const id = `${unitId}-l${lessonOrder}-s${stepOrder}`;
  const scored = stepOrder >= 8;
  const kind = scored ? "SCORED_TEST" : VARIANTS[(lessonOrder + stepOrder - 2) % VARIANTS.length]!;
  const isTeaching = kind === "TEACHING";
  const base = {
    id,
    prompt: scored ? "Answer without a hint." : `Practice this MSA reading and writing pattern: ${arabic}.`,
    arabic,
    ...(!scored && !isTeaching ? { hints: ["Read from right to left."] } : {}),
    scored,
  };
  if (kind === "TEACHING") return { ...base, kind };
  const exerciseDefinition = exercise(`${id}-exercise`, "Choose or type the MSA answer.", arabic);
  if (kind === "HANDWRITING") {
    return { ...base, kind, exercise: exerciseDefinition, handwritingTemplateId: "alif-stroke" };
  }
  return { ...base, kind, exercise: exerciseDefinition };
}

function lesson(unitId: string, order: number, skillId: string, arabic: string, kind: "LESSON" | "CHECKPOINT" = "LESSON"): LessonDefinition {
  const steps = Array.from({ length: 10 }, (_, index) => step(unitId, order, index + 1, arabic));
  return {
    id: `${unitId}-${kind === "CHECKPOINT" ? "checkpoint" : `lesson-${order}`}`,
    title: kind === "CHECKPOINT" ? "Unit checkpoint" : `Core lesson ${order}`,
    order,
    kind,
    skillIds: kind === "CHECKPOINT" ? [`${unitId}-skill-8`] : [skillId],
    steps,
    ...(kind === "CHECKPOINT" ? { assessment: { id: `${unitId}-assessment`, title: "Unit checkpoint", exerciseIds: steps.slice(-3).map((item) => item.exercise!.id), passingScore: 80 } } : {}),
  };
}

function skill(unitId: string, index: number, arabic: string, predecessor?: string): SkillDefinition {
  return {
    id: `${unitId}-skill-${index}`,
    title: `MSA decoding skill ${index}`,
    readingOutcome: `Read ${arabic} from right to left in controlled MSA material.`,
    writingOutcome: `Write ${arabic} accurately in controlled MSA material.`,
    prerequisiteSkillIds: predecessor ? [predecessor] : [],
    vocabularyAtomIds: ["letter-alif"],
    grammarAtomIds: [],
    examples: [{ english: "Read and write the model.", arabic }],
    acceptedAnswerPolicy: "NORMALIZED_ARABIC",
    masteryThreshold: 80,
    reviewRule: { afterDays: 1, requireCorrect: 3 },
  };
}

function unit(spec: (typeof UNIT_SPECS)[number], order: number, predecessor?: string): { unit: CourseUnit; skills: SkillDefinition[] } {
  const [id, title, subtitle, arabic] = spec;
  const skills = Array.from({ length: 8 }, (_, index) => skill(id, index + 1, arabic, index === 0 ? predecessor : `${id}-skill-${index}`));
  return {
    unit: { id, title, subtitle, order, lessons: [...skills.map((item, index) => lesson(id, index + 1, item.id, arabic)), lesson(id, 9, `${id}-skill-8`, arabic, "CHECKPOINT")] },
    skills,
  };
}

const assembled = UNIT_SPECS.map((spec, index) => unit(spec, index + 1, index === 0 ? undefined : `${UNIT_SPECS[index - 1]![0]}-skill-8`));

export const ACTIVE_COURSE: CourseLevel = deepFreeze({
  id: "pre-a1-v1",
  version: 1,
  level: "PRE_A1",
  title: "Nawa Pre-A1 MSA",
  units: assembled.map((item) => item.unit),
  skills: assembled.flatMap((item) => item.skills),
  handwritingTemplates: [{ id: "alif-stroke", glyph: "ا", direction: "RTL", strokes: ["top-to-bottom"] }],
});

validateCourseCatalog(ACTIVE_COURSE);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
