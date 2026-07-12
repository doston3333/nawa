export type Ability = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
export type MasteryState = "ENCOUNTERED" | "RECOGNIZED" | "RETRIEVED" | "APPLIED" | "RETAINED";
export type AtomKind = "LETTER" | "PHONEME" | "WORD" | "PHRASE" | "GRAMMAR" | "CONSTRUCTION";
export type ResponseMode = "SELECT" | "TYPE" | "SPEAK" | "WRITE";
export type HelpLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SessionStage = "ARRIVAL" | "RETRIEVAL" | "NEW_CONCEPT" | "INPUT" | "OUTPUT" | "CLOSE";

export interface KnowledgeAtom {
  id: string;
  kind: AtomKind;
  register: "MSA";
  canonicalArabic: string;
  vocalizedArabic: string;
  englishGloss: string;
  prerequisiteIds: string[];
  abilities: Ability[];
  /** Optional morphology for Language Ink lite */
  root?: string;
  patternNote?: string;
}

export interface EvidenceEvent {
  id: string;
  profileId: string;
  atomId: string;
  ability: Ability;
  occurredAt: string;
  correct: boolean;
  responseMode: ResponseMode;
  helpLevel: HelpLevel;
  latencyMs: number;
  confidence: 1 | 2 | 3 | 4 | 5;
  novelContext: boolean;
  analysisConfidence: number | null;
  /** Optional versioned-course context; absent on preserved legacy evidence. */
  curriculumVersion?: number | null;
  skillId?: string | null;
  exerciseType?: string | null;
  responseTimeMs?: number | null;
  hintUsed?: boolean | null;
  errorClassification?: string | null;
  handwritingMetrics?: Record<string, unknown> | null;
}

export interface MasterySnapshot {
  profileId: string;
  atomId: string;
  ability: Ability;
  state: MasteryState;
  successfulRetrievals: number;
  lastAttemptAt: string | null;
  lastSuccessfulRetrievalAt: string | null;
  nextReviewAt: string;
}

export type TaskKind = "CALIBRATION" | "RECALL" | "LESSON" | "READ" | "PRODUCE" | "JOURNAL" | "SELECT";

export interface SessionTask {
  id: string;
  stage: SessionStage | "LESSON";
  kind: TaskKind;
  atomIds: string[];
  prompt: string;
  promptArabic: string | null;
  expectedAnswer: string | null;
  estimatedMinutes: number;
  /** Optional gloss for Language Ink on the Arabic surface */
  inkAtomId?: string | null;
  /** Multiple-choice options for SELECT exercises */
  choices?: string[] | null;
  responseMode?: ResponseMode;
}

export type SessionMode = "STUDY_ROOM" | "LESSON";

export interface SessionPlan {
  id: string;
  profileId: string;
  durationMinutes: 30 | 45 | 60;
  createdAt: string;
  tasks: SessionTask[];
  mode?: SessionMode;
  lessonId?: string | null;
}

export interface StudySessionView {
  plan: SessionPlan;
  currentTaskIndex: number;
  status: "ACTIVE" | "COMPLETE";
}

export type LessonNodeStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETE";

export type LessonKind = "LESSON" | "CHECKPOINT";

export interface LessonDef {
  id: string;
  unitId: string;
  title: string;
  order: number;
  atomIds: string[];
  exerciseCount: number;
  /** Default LESSON; CHECKPOINT is a scored mini-test for the unit */
  kind?: LessonKind;
  /** Short MSA explanations shown before/during the lesson */
  tips?: string[];
}

export interface UnitDef {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  lessonIds: string[];
}

export interface LessonProgressRecord {
  lessonId: string;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETE";
  scoreCorrect: number;
  scoreTotal: number;
  completedAt: string | null;
}

export interface PathLessonView extends LessonDef {
  status: LessonNodeStatus;
  scoreCorrect: number;
  scoreTotal: number;
}

export interface PathUnitView extends UnitDef {
  lessons: PathLessonView[];
}

export interface LearnPathView {
  units: PathUnitView[];
  nextLessonId: string | null;
}
