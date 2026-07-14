import type { AcceptedAnswerPolicy, CourseUnit, ExerciseDefinition, LessonDefinition, LessonStep, SkillDefinition } from "./types";

interface RtlLessonSpec {
  title: string;
  skillTitle: string;
  focus: string;
  explanation: string;
  rule: string;
  model: string;
  answer: string;
  contrast: string;
  choices: readonly string[];
  writingPrompt: string;
  traceGlyph: string;
}

const SPECS: readonly RtlLessonSpec[] = [
  {
    title: "Start on the right", skillTitle: "Right-edge entry", focus: "where Arabic reading begins",
    explanation: "Arabic lines begin at the right edge. Your eyes enter the line on the right, then travel left.",
    rule: "Begin with the rightmost Arabic item.", model: "ا ب ت", answer: "ا", contrast: "English enters from the left; Arabic enters from the right.",
    choices: ["ا", "ب", "ت"], writingPrompt: "Copy the first item you read on the right.", traceGlyph: "ا",
  },
  {
    title: "Move left", skillTitle: "Leftward tracking", focus: "how the eye moves across an Arabic line",
    explanation: "After the first item, continue leftward without jumping back to the right.",
    rule: "Read each next item to the left.", model: "ا ب ت", answer: "ب", contrast: "ب follows ا when the sequence is read from right to left.",
    choices: ["ب", "ا", "ت"], writingPrompt: "Type the middle item in the displayed sequence.", traceGlyph: "ب",
  },
  {
    title: "Track a complete line", skillTitle: "Continuous RTL tracking", focus: "keeping one direction across a line",
    explanation: "A reliable reader completes the line in one leftward sweep instead of guessing from isolated shapes.",
    rule: "Enter right, move left, and finish at the left edge.", model: "ا ب ت ث", answer: "ث", contrast: "The final item is at the left edge, not the right edge.",
    choices: ["ث", "ا", "ب", "ت"], writingPrompt: "Type the final item reached at the left edge.", traceGlyph: "ث",
  },
  {
    title: "Find the baseline", skillTitle: "Arabic baseline", focus: "the invisible line that organizes Arabic writing",
    explanation: "Arabic letters sit on or return to a shared baseline. The baseline keeps a word visually stable.",
    rule: "Align the main body of each letter with the same baseline.", model: "باب", answer: "باب", contrast: "The vertical stroke rises; the connected body remains anchored to one line.",
    choices: ["باب", "ب ا ب", "اب"], writingPrompt: "Copy the model as one baseline-aligned word.", traceGlyph: "ب",
  },
  {
    title: "Notice above and below", skillTitle: "Baseline relationships", focus: "marks above and below the baseline",
    explanation: "Dots may sit above or below a letter, but the letter body still belongs to the baseline.",
    rule: "Use the body—not the dots—to judge baseline alignment.", model: "ب ت", answer: "ب", contrast: "ب has its dot below; ت has two dots above.",
    choices: ["ب", "ت", "ا"], writingPrompt: "Type the letter whose dot sits below the baseline.", traceGlyph: "ب",
  },
  {
    title: "See word boundaries", skillTitle: "Arabic word spacing", focus: "distinguishing internal joins from spaces",
    explanation: "Letters inside a word stay close. A larger blank space marks the boundary between words.",
    rule: "Treat the larger gap as a word boundary.", model: "باب بيت", answer: "2", contrast: "باببيت is one unbroken run; باب بيت contains two visual word groups.",
    choices: ["2", "1", "3"], writingPrompt: "Type the number of word groups in the model.", traceGlyph: "ا",
  },
  {
    title: "Copy in the right order", skillTitle: "RTL copying", focus: "preserving order while copying Arabic",
    explanation: "Copy the rightmost item first, then add each next item to its left.",
    rule: "Preserve the displayed right-to-left order.", model: "ا ب ت", answer: "ا ب ت", contrast: "ت ب ا reverses the logical order of the model.",
    choices: ["ا ب ت", "ت ب ا", "ب ا ت"], writingPrompt: "Type the complete sequence exactly as shown.", traceGlyph: "ت",
  },
  {
    title: "Direction and baseline review", skillTitle: "RTL orientation mastery", focus: "combining direction, spacing, and baseline awareness",
    explanation: "Strong Arabic decoding combines a right-edge start, continuous leftward tracking, and stable word spacing.",
    rule: "Read direction first; then check baseline and spaces.", model: "باب بات", answer: "باب", contrast: "باب is the rightmost word group; بات is the group to its left.",
    choices: ["باب", "بات", "2"], writingPrompt: "Type the first word group you read.", traceGlyph: "ا",
  },
];

function exercise(id: string, prompt: string, answer: string, choices: readonly string[] | undefined, spec: RtlLessonSpec, policy: AcceptedAnswerPolicy = "EXACT"): ExerciseDefinition {
  return {
    id, prompt, ...(choices ? { choices } : {}), acceptedAnswer: { policy, values: [answer] },
    feedback: {
      correct: `Yes—this shows ${spec.focus}.`,
      incorrect: `Look again at ${spec.focus}.`,
      rule: spec.rule,
      contrast: spec.contrast,
    },
  };
}

function authoredSteps(order: number, spec: RtlLessonSpec): LessonStep[] {
  const id = (step: number) => `rtl-baseline-l${order}-s${step}`;
  const ex = (step: number, prompt: string, answer: string, choices?: readonly string[], policy?: AcceptedAnswerPolicy) =>
    exercise(`${id(step)}-exercise`, prompt, answer, choices, spec, policy);
  return [
    { id: id(1), kind: "TEACHING", prompt: `Learn: ${spec.focus}`, arabic: spec.model, explanation: spec.explanation, rule: spec.rule, scored: false },
    { id: id(2), kind: "COMPARISON", prompt: `Notice the contrast in “${spec.title}”`, arabic: spec.model, hints: [spec.contrast], scored: false, exercise: ex(2, "Choose the item that follows today’s rule.", spec.answer, spec.choices) },
    { id: id(3), kind: "MATCHING", prompt: `Match the model using ${spec.focus}`, arabic: spec.model, hints: [spec.rule], scored: false, exercise: ex(3, "Match the model to the correct response.", spec.answer, spec.choices) },
    { id: id(4), kind: "TYPING", prompt: `Write what you identified in “${spec.title}”`, arabic: spec.model, hints: [spec.rule], scored: false, exercise: ex(4, spec.writingPrompt, spec.answer, undefined, "NORMALIZED_ARABIC") },
    { id: id(5), kind: "CORRECTION", prompt: `Repair a mistake about ${spec.focus}`, arabic: spec.model, hints: [spec.contrast], scored: false, exercise: ex(5, "Type the corrected response.", spec.answer, undefined, spec.answer === "2" ? "EXACT" : "NORMALIZED_ARABIC") },
    { id: id(6), kind: "HANDWRITING", prompt: `Trace while keeping ${spec.focus} in mind`, arabic: spec.traceGlyph, hints: ["Keep the main stroke steady against the guide."], scored: false, exercise: ex(6, "Trace the model, then save the attempt.", spec.traceGlyph), handwritingTemplateId: "alif-stroke" },
    { id: id(7), kind: "SORTING", prompt: `Put the response in order for “${spec.title}”`, arabic: spec.model, hints: [spec.rule], scored: false, exercise: ex(7, "Choose the response whose order follows the rule.", spec.answer, spec.choices) },
    { id: id(8), kind: "SCORED_TEST", prompt: `Check 1: recognize ${spec.focus}`, arabic: spec.model, scored: true, exercise: ex(8, "Choose without a hint.", spec.answer, spec.choices) },
    { id: id(9), kind: "SCORED_TEST", prompt: `Check 2: produce the answer for “${spec.title}”`, arabic: spec.model, scored: true, exercise: ex(9, spec.writingPrompt, spec.answer, undefined, spec.answer === "2" ? "EXACT" : "NORMALIZED_ARABIC") },
    { id: id(10), kind: "SCORED_TEST", prompt: `Check 3: distinguish the correct model`, arabic: spec.model, scored: true, exercise: ex(10, "Select the response that preserves the rule.", spec.answer, spec.choices) },
  ];
}

function lesson(spec: RtlLessonSpec, index: number): LessonDefinition {
  return { id: `rtl-baseline-lesson-${index}`, title: spec.title, order: index, kind: "LESSON", skillIds: [`rtl-baseline-skill-${index}`], steps: authoredSteps(index, spec) };
}

function skill(spec: RtlLessonSpec, index: number): SkillDefinition {
  return {
    id: `rtl-baseline-skill-${index}`, title: spec.skillTitle,
    readingOutcome: `Identify ${spec.focus} in controlled Arabic material.`,
    writingOutcome: `Apply ${spec.focus} when copying a controlled Arabic model.`,
    prerequisiteSkillIds: index === 1 ? [] : [`rtl-baseline-skill-${index - 1}`],
    vocabularyAtomIds: ["letter-alif"], grammarAtomIds: [],
    examples: [{ english: spec.focus, arabic: spec.model }], acceptedAnswerPolicy: "NORMALIZED_ARABIC",
    masteryThreshold: 80, reviewRule: { afterDays: 1, requireCorrect: 3 },
  };
}

function cumulativeCheckpointSteps(): LessonStep[] {
  const id = (step: number) => `rtl-baseline-l9-s${step}`;
  const make = (step: number, prompt: string, answer: string, choices: readonly string[] | undefined, spec: RtlLessonSpec, policy: AcceptedAnswerPolicy = "EXACT") =>
    exercise(`${id(step)}-exercise`, prompt, answer, choices, spec, policy);
  return [
    { id: id(1), kind: "TEACHING", prompt: "Prepare for the cumulative direction and baseline check", arabic: "ا ب ت  باب بيت", explanation: "This checkpoint combines right-edge entry, leftward tracking, baseline awareness, and word spacing.", rule: "Read direction first; then inspect baseline and spaces.", scored: false },
    { id: id(2), kind: "COMPARISON", prompt: "Re-establish the right-edge starting point", arabic: "ا ب ت", hints: [SPECS[0]!.rule], scored: false, exercise: make(2, "Choose the first item read.", "ا", ["ا", "ب", "ت"], SPECS[0]!) },
    { id: id(3), kind: "COMPREHENSION", prompt: "Track all the way to the left edge", arabic: "ا ب ت ث", hints: [SPECS[2]!.rule], scored: false, exercise: make(3, "Choose the final item reached.", "ث", ["ث", "ا", "ب", "ت"], SPECS[2]!) },
    { id: id(4), kind: "TYPING", prompt: "Copy a baseline-aligned word", arabic: "باب", hints: [SPECS[3]!.rule], scored: false, exercise: make(4, "Type the model as one word.", "باب", undefined, SPECS[3]!, "NORMALIZED_ARABIC") },
    { id: id(5), kind: "CORRECTION", prompt: "Use dot placement without losing the baseline", arabic: "ب ت", hints: [SPECS[4]!.contrast], scored: false, exercise: make(5, "Type the letter with a dot below.", "ب", undefined, SPECS[4]!, "NORMALIZED_ARABIC") },
    { id: id(6), kind: "HANDWRITING", prompt: "Trace a steady baseline model", arabic: "ا", hints: ["Keep the stroke tall and steady."], scored: false, exercise: make(6, "Trace and save the model.", "ا", undefined, SPECS[3]!), handwritingTemplateId: "alif-stroke" },
    { id: id(7), kind: "COMPLETION", prompt: "Count the word groups", arabic: "باب بيت", hints: [SPECS[5]!.rule], scored: false, exercise: make(7, "Type the number of word groups.", "2", undefined, SPECS[5]!) },
    { id: id(8), kind: "SCORED_TEST", prompt: "Checkpoint 1: right-edge entry", arabic: "ا ب ت", scored: true, exercise: make(8, "Choose the first item read.", "ا", ["ا", "ب", "ت"], SPECS[0]!) },
    { id: id(9), kind: "SCORED_TEST", prompt: "Checkpoint 2: preserve complete order", arabic: "ا ب ت", scored: true, exercise: make(9, "Type the complete sequence.", "ا ب ت", undefined, SPECS[6]!, "NORMALIZED_ARABIC") },
    { id: id(10), kind: "SCORED_TEST", prompt: "Checkpoint 3: identify the first word group", arabic: "باب بات", scored: true, exercise: make(10, "Type the first word group read.", "باب", undefined, SPECS[7]!, "NORMALIZED_ARABIC") },
  ];
}

export function buildRtlBaselineProgram(): { unit: CourseUnit; skills: SkillDefinition[] } {
  const lessons = SPECS.map((spec, index) => lesson(spec, index + 1));
  const checkpointSteps = cumulativeCheckpointSteps();
  return {
    unit: {
      id: "rtl-baseline", title: "RTL and baseline", subtitle: "Build the visual habits Arabic reading depends on", order: 1,
      lessons: [...lessons, {
        id: "rtl-baseline-checkpoint", title: "Direction and baseline checkpoint", order: 9, kind: "CHECKPOINT",
        skillIds: ["rtl-baseline-skill-8"], steps: checkpointSteps,
        assessment: { id: "rtl-baseline-assessment", title: "Direction and baseline checkpoint", exerciseIds: checkpointSteps.slice(-3).map((step) => step.exercise!.id), passingScore: 80 },
      }],
    },
    skills: SPECS.map((spec, index) => skill(spec, index + 1)),
  };
}
