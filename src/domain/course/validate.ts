import type { CourseLevel } from "./types";

const ARABIC = /[\u0621-\u064A\u064B-\u065F\u0670\u0671\u067E\u0686\u0698\u06A9\u06AF\u06CC]/u;

function unique(items: readonly { id: string }[], label: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id)) {
      throw new Error(`Course catalog has duplicate ${label} id: ${item.id}`);
    }
    ids.add(item.id);
  }
}

/** Throws an actionable error when a versioned course cannot be published. */
export function validateCourseCatalog(course: CourseLevel): void {
  if (!/^pre-a1-v\d+$/.test(course.id)) {
    throw new Error("Course catalog id must be versioned as pre-a1-vN");
  }
  unique(course.units, "unit");
  unique(course.skills, "skill");
  unique(course.handwritingTemplates, "handwriting template");

  const skillIds = new Set(course.skills.map((item) => item.id));
  const skillPosition = new Map(course.skills.map((item, index) => [item.id, index]));
  for (const skill of course.skills) {
    if (!skill.examples.length || skill.examples.some((example) => !ARABIC.test(example.arabic))) {
      throw new Error(`Skill ${skill.id} needs valid MSA Arabic examples`);
    }
    if (skill.masteryThreshold < 1 || skill.masteryThreshold > 100) {
      throw new Error(`Skill ${skill.id} has an invalid mastery threshold`);
    }
    for (const prerequisite of skill.prerequisiteSkillIds) {
      if (!skillIds.has(prerequisite)) {
        throw new Error(`Skill ${skill.id} references unknown prerequisite ${prerequisite}`);
      }
      if (skillPosition.get(prerequisite)! >= skillPosition.get(skill.id)!) {
        throw new Error(`Skill ${skill.id} prerequisite must come first: ${prerequisite}`);
      }
    }
  }

  const lessonIds = new Set<string>();
  for (const unit of course.units) {
    const core = unit.lessons.filter((item) => item.kind === "LESSON");
    const checkpoints = unit.lessons.filter((item) => item.kind === "CHECKPOINT");
    if (core.length < 8 || checkpoints.length !== 1) {
      throw new Error(`Unit ${unit.id} needs at least eight lessons and one checkpoint`);
    }
    for (const lesson of unit.lessons) {
      if (lessonIds.has(lesson.id)) throw new Error(`Course catalog has duplicate lesson id: ${lesson.id}`);
      lessonIds.add(lesson.id);
      if (lesson.steps.length < 10 || lesson.steps.length > 14) {
        throw new Error(`Lesson ${lesson.id} must have 10–14 deterministic steps`);
      }
      unique(lesson.steps, `step in ${lesson.id}`);
      const scored = lesson.steps.filter((item) => item.scored);
      if (
        scored.length < 3 ||
        scored.length > 5 ||
        !lesson.steps.slice(-scored.length).every((item) => item.scored && !item.hints?.length)
      ) {
        throw new Error(`Lesson ${lesson.id} must end with 3–5 no-hint scored checks`);
      }
      for (const step of lesson.steps) {
        if (!step.arabic || !ARABIC.test(step.arabic)) {
          throw new Error(`Step ${step.id} needs valid MSA Arabic`);
        }
        if (step.kind !== "TEACHING" && !step.exercise) {
          throw new Error(`Step ${step.id} needs an answer schema`);
        }
        if (step.exercise && (!step.exercise.acceptedAnswer.values.length || !step.exercise.acceptedAnswer.policy)) {
          throw new Error(`Step ${step.id} has an invalid answer schema`);
        }
      }
      if (lesson.kind === "CHECKPOINT" && (!lesson.assessment || lesson.assessment.exerciseIds.length < 3)) {
        throw new Error(`Checkpoint ${lesson.id} needs an assessment`);
      }
    }
  }
}
