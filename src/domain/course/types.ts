export type CourseLevelId = "PRE_A1";
export type LessonKind = "LESSON" | "CHECKPOINT";
export type StepKind =
  | "TEACHING"
  | "COMPARISON"
  | "MATCHING"
  | "SORTING"
  | "WORD_TILES"
  | "SENTENCE_ORDERING"
  | "COMPLETION"
  | "TYPING"
  | "CORRECTION"
  | "COMPREHENSION"
  | "COMPOSITION"
  | "HANDWRITING"
  | "SCORED_TEST";

export type AcceptedAnswerPolicy = "EXACT" | "NORMALIZED_ARABIC" | "ORDERED_TOKENS" | "ANY_OF";

export interface AcceptedAnswer {
  policy: AcceptedAnswerPolicy;
  values: readonly string[];
}

export interface HandwritingTemplate {
  id: string;
  glyph: string;
  direction: "RTL";
  strokes: readonly string[];
}

export interface ExerciseDefinition {
  id: string;
  prompt: string;
  promptArabic?: string;
  choices?: readonly string[];
  acceptedAnswer: AcceptedAnswer;
}

export interface AssessmentDefinition {
  id: string;
  title: string;
  exerciseIds: readonly string[];
  passingScore: number;
}

interface LessonStepBase {
  id: string;
  prompt: string;
  arabic?: string;
  hints?: readonly string[];
  scored: boolean;
}

export interface TeachingStep extends LessonStepBase {
  kind: "TEACHING";
  exercise?: never;
  handwritingTemplateId?: never;
}

export interface HandwritingStep extends LessonStepBase {
  kind: "HANDWRITING";
  exercise: ExerciseDefinition;
  handwritingTemplateId: string;
}

export interface ExerciseStep extends LessonStepBase {
  kind: Exclude<StepKind, "TEACHING" | "HANDWRITING">;
  exercise: ExerciseDefinition;
  handwritingTemplateId?: never;
}

/** A discriminated union makes each interaction's required payload explicit. */
export type LessonStep = TeachingStep | HandwritingStep | ExerciseStep;

export interface LessonDefinition {
  id: string;
  title: string;
  order: number;
  kind: LessonKind;
  skillIds: readonly string[];
  steps: readonly LessonStep[];
  assessment?: AssessmentDefinition;
}

export interface SkillDefinition {
  id: string;
  title: string;
  readingOutcome: string;
  writingOutcome: string;
  prerequisiteSkillIds: readonly string[];
  vocabularyAtomIds: readonly string[];
  grammarAtomIds: readonly string[];
  examples: readonly { english: string; arabic: string }[];
  acceptedAnswerPolicy: AcceptedAnswerPolicy;
  masteryThreshold: number;
  reviewRule: { afterDays: number; requireCorrect: number };
}

export interface CourseUnit {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  lessons: readonly LessonDefinition[];
}

export interface CourseLevel {
  id: string;
  version: number;
  level: CourseLevelId;
  title: string;
  units: readonly CourseUnit[];
  skills: readonly SkillDefinition[];
  handwritingTemplates: readonly HandwritingTemplate[];
}
