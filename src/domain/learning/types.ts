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
}

export interface EvidenceEvent {
  id: string;
  learnerId: string;
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
}

export interface MasterySnapshot {
  learnerId: string;
  atomId: string;
  ability: Ability;
  state: MasteryState;
  successfulRetrievals: number;
  lastAttemptAt: string | null;
  lastSuccessfulRetrievalAt: string | null;
  nextReviewAt: string;
}

export type TaskKind = "CALIBRATION" | "RECALL" | "LESSON" | "READ" | "PRODUCE" | "JOURNAL";

export interface SessionTask {
  id: string;
  stage: SessionStage;
  kind: TaskKind;
  atomIds: string[];
  prompt: string;
  promptArabic: string | null;
  expectedAnswer: string | null;
  estimatedMinutes: number;
}

export interface SessionPlan {
  id: string;
  learnerId: string;
  durationMinutes: 30 | 45 | 60;
  createdAt: string;
  tasks: SessionTask[];
}

export interface StudySessionView {
  plan: SessionPlan;
  currentTaskIndex: number;
  status: "ACTIVE" | "COMPLETE";
}
