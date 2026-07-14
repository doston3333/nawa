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
import { buildRtlBaselineProgram } from "./rtl-baseline-unit";

export * from "./types";
export { validateCourseCatalog } from "./validate";

interface UnitSpec {
  id: string;
  title: string;
  subtitle: string;
  lessons: readonly { title: string; arabic: string }[];
}

const UNIT_SPECS: readonly UnitSpec[] = [
  { id: "rtl-baseline", title: "RTL and baseline", subtitle: "Read and write from right to left", lessons: [
    { title: "Right to left", arabic: "ا" }, { title: "Find the baseline", arabic: "ب" },
    { title: "Keep one direction", arabic: "ت" }, { title: "Space a word", arabic: "اب" },
    { title: "Follow the line", arabic: "بت" }, { title: "Read a short run", arabic: "ابت" },
    { title: "Copy with a baseline", arabic: "باب" }, { title: "First direction check", arabic: "بيت" },
  ] },
  { id: "letter-families-i", title: "Letter families I", subtitle: "Recognize shared letter shapes", lessons: [
    { title: "One dot below: ب", arabic: "ب" }, { title: "Two dots above: ت", arabic: "ت" },
    { title: "Three dots above: ث", arabic: "ث" }, { title: "The ب ت ث family", arabic: "بتث" },
    { title: "One dot above: ن", arabic: "ن" }, { title: "Two dots below: ي", arabic: "ي" },
    { title: "No dots: ا", arabic: "ا" }, { title: "Family I recall", arabic: "بيت" },
  ] },
  { id: "letter-families-ii", title: "Letter families II", subtitle: "Distinguish more dot patterns", lessons: [
    { title: "The ج shape", arabic: "ج" }, { title: "The ح shape", arabic: "ح" },
    { title: "The خ shape", arabic: "خ" }, { title: "The ج ح خ family", arabic: "جحخ" },
    { title: "The د and ذ family", arabic: "د ذ" }, { title: "The ر and ز family", arabic: "ر ز" },
    { title: "Spot the dot", arabic: "خز" }, { title: "Family II recall", arabic: "خبز" },
  ] },
  { id: "connections", title: "Connections", subtitle: "Join Arabic letters correctly", lessons: [
    { title: "Initial forms", arabic: "بـ" }, { title: "Medial forms", arabic: "ـبـ" },
    { title: "Final forms", arabic: "ـب" }, { title: "Letters that do not join", arabic: "د ر" },
    { title: "Connect two letters", arabic: "بت" }, { title: "Break after د", arabic: "بد" },
    { title: "Build بيت", arabic: "بيت" }, { title: "Connection recall", arabic: "باب" },
  ] },
  { id: "short-vowels-sukun", title: "Short vowels and sukun", subtitle: "Decode short vowel marks", lessons: [
    { title: "Fatha: ـَ", arabic: "بَ" }, { title: "Kasra: ـِ", arabic: "بِ" },
    { title: "Damma: ـُ", arabic: "بُ" }, { title: "Sukun: ـْ", arabic: "بْ" },
    { title: "Read بَتَ", arabic: "بَتَ" }, { title: "Read بِنت", arabic: "بِنْت" },
    { title: "Read كُتُب", arabic: "كُتُب" }, { title: "Vowel recall", arabic: "بَيْت" },
  ] },
  { id: "long-vowels-shadda-tanwin", title: "Long vowels, shadda and tanwin", subtitle: "Read common sound marks", lessons: [
    { title: "Long ā with ا", arabic: "بَا" }, { title: "Long ī with ي", arabic: "بِي" },
    { title: "Long ū with و", arabic: "بُو" }, { title: "Shadda: ـّ", arabic: "بّ" },
    { title: "Tanwin fatḥ", arabic: "بً" }, { title: "Tanwin kasr", arabic: "بٍ" },
    { title: "Tanwin ḍamm", arabic: "بٌ" }, { title: "Length and mark recall", arabic: "كِتَابٌ" },
  ] },
  { id: "special-orthography", title: "Special orthography", subtitle: "Recognize frequent special forms", lessons: [
    { title: "Tāʾ marbūṭa", arabic: "ة" }, { title: "Alif maqṣūra", arabic: "ى" },
    { title: "Hamza", arabic: "ء" }, { title: "Lām-alif", arabic: "لا" },
    { title: "Definite article", arabic: "ال" }, { title: "Sun and moon letters", arabic: "الشمس" },
    { title: "Read مدرسة", arabic: "مَدْرَسَة" }, { title: "Special forms recall", arabic: "هَذِهِ" },
  ] },
  { id: "decoding-first-phrases", title: "Decoding and first phrases", subtitle: "Read and write first MSA phrases", lessons: [
    { title: "A greeting", arabic: "مَرْحَبًا" }, { title: "My name", arabic: "اِسْمِي" },
    { title: "This is a book", arabic: "هَذَا كِتَاب" }, { title: "A big house", arabic: "بَيْتٌ كَبِيرٌ" },
    { title: "I read", arabic: "أَنَا أَقْرَأُ" }, { title: "I write", arabic: "أَنَا أَكْتُبُ" },
    { title: "A short sentence", arabic: "هَذِهِ مَدْرَسَة" }, { title: "First phrases recall", arabic: "أَنَا طَالِبٌ" },
  ] },
];

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

function lesson(unitId: string, order: number, skillId: string, arabic: string, title: string, kind: "LESSON" | "CHECKPOINT" = "LESSON"): LessonDefinition {
  const steps = Array.from({ length: 10 }, (_, index) => step(unitId, order, index + 1, arabic));
  return {
    id: `${unitId}-${kind === "CHECKPOINT" ? "checkpoint" : `lesson-${order}`}`,
    title: kind === "CHECKPOINT" ? "Unit checkpoint" : title,
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

function unit(spec: UnitSpec, order: number, predecessor?: string): { unit: CourseUnit; skills: SkillDefinition[] } {
  const { id, title, subtitle } = spec;
  const skills = spec.lessons.map((lessonSpec, index) => skill(id, index + 1, lessonSpec.arabic, index === 0 ? predecessor : `${id}-skill-${index}`));
  return {
    unit: {
      id, title, subtitle, order,
      lessons: [
        ...skills.map((item, index) => lesson(id, index + 1, item.id, spec.lessons[index]!.arabic, spec.lessons[index]!.title)),
        lesson(id, 9, `${id}-skill-8`, spec.lessons[7]!.arabic, "Unit checkpoint", "CHECKPOINT"),
      ],
    },
    skills,
  };
}

const rtlBaseline = buildRtlBaselineProgram();
const assembled = [
  rtlBaseline,
  ...UNIT_SPECS.slice(1).map((spec, index) => unit(spec, index + 2, `${UNIT_SPECS[index]!.id}-skill-8`)),
];

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
