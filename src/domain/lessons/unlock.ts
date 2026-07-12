import type {
  LearnPathView,
  LessonDef,
  LessonNodeStatus,
  LessonProgressRecord,
  PathLessonView,
  PathUnitView,
  UnitDef,
} from "@/domain/learning/types";
import { ACTIVE_LESSONS, ACTIVE_UNITS, orderedActiveLessons } from "@/domain/curriculum/path";

export function previousLessonId(lessonId: string, lessons: LessonDef[] = orderedActiveLessons()): string | null {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return null;
  return lessons[index - 1]?.id ?? null;
}

export function deriveLessonStatus(
  lessonId: string,
  progressById: Map<string, LessonProgressRecord>,
  lessons: LessonDef[] = orderedActiveLessons(),
): LessonNodeStatus {
  const record = progressById.get(lessonId);
  if (record?.status === "COMPLETE") return "COMPLETE";
  if (record?.status === "IN_PROGRESS") return "IN_PROGRESS";

  const prev = previousLessonId(lessonId, lessons);
  if (!prev) return "AVAILABLE";

  const prevRecord = progressById.get(prev);
  if (prevRecord?.status === "COMPLETE") return "AVAILABLE";
  return "LOCKED";
}

export function buildLearnPathView(
  progress: LessonProgressRecord[],
  units: UnitDef[] = ACTIVE_UNITS,
  lessons: LessonDef[] = ACTIVE_LESSONS,
): LearnPathView {
  const progressById = new Map(progress.map((item) => [item.lessonId, item]));
  const ordered = [...lessons].sort((a, b) => {
    const unitA = units.find((unit) => unit.id === a.unitId)?.order ?? 0;
    const unitB = units.find((unit) => unit.id === b.unitId)?.order ?? 0;
    return unitA - unitB || a.order - b.order;
  });

  const unitViews: PathUnitView[] = [...units]
    .sort((a, b) => a.order - b.order)
    .map((unit) => {
      const unitLessons: PathLessonView[] = unit.lessonIds
        .map((id) => lessons.find((lesson) => lesson.id === id))
        .filter((lesson): lesson is LessonDef => Boolean(lesson))
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const record = progressById.get(lesson.id);
          return {
            ...lesson,
            status: deriveLessonStatus(lesson.id, progressById, ordered),
            scoreCorrect: record?.scoreCorrect ?? 0,
            scoreTotal: record?.scoreTotal ?? 0,
          };
        });
      return { ...unit, lessons: unitLessons };
    });

  const next = ordered.find((lesson) => {
    const status = deriveLessonStatus(lesson.id, progressById, ordered);
    return status === "AVAILABLE" || status === "IN_PROGRESS";
  });

  return { units: unitViews, nextLessonId: next?.id ?? null };
}

export function isLessonComplete(scoreCorrect: number, scoreTotal: number, minRatio = 0.6): boolean {
  if (scoreTotal <= 0) return false;
  return scoreCorrect / scoreTotal >= minRatio;
}
