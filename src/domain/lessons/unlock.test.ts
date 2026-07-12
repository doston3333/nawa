import { buildLearnPathView, isLessonComplete, previousLessonId } from "./unlock";
import { ACTIVE_LESSONS, orderedActiveLessons } from "@/domain/curriculum/path";

describe("lesson unlock chain", () => {
  it("opens only the first lesson with empty progress", () => {
    const path = buildLearnPathView([]);
    expect(path.nextLessonId).toBe("rtl-baseline-lesson-1");
    expect(path.units[0]?.lessons[0]?.status).toBe("AVAILABLE");
    expect(path.units[0]?.lessons[1]?.status).toBe("LOCKED");
    expect(path.units[1]?.lessons[0]?.status).toBe("LOCKED");
  });

  it("unlocks the next lesson after complete", () => {
    const path = buildLearnPathView([
      {
        lessonId: "rtl-baseline-lesson-1",
        status: "COMPLETE",
        scoreCorrect: 7,
        scoreTotal: 8,
        completedAt: "2026-07-12T00:00:00.000Z",
      },
    ]);
    expect(path.units[0]?.lessons[0]?.status).toBe("COMPLETE");
    expect(path.units[0]?.lessons[1]?.status).toBe("AVAILABLE");
    expect(path.nextLessonId).toBe("rtl-baseline-lesson-2");
  });

  it("unlocks the unit checkpoint after all regular unit lessons", () => {
    const activeLessons = orderedActiveLessons().filter((lesson) => lesson.unitId === "rtl-baseline" && lesson.kind !== "CHECKPOINT");
    const progress = activeLessons.map((lesson) => ({
      lessonId: lesson.id,
      status: "COMPLETE" as const,
      scoreCorrect: 8,
      scoreTotal: 8,
      completedAt: "2026-07-12T00:00:00.000Z",
    }));
    const path = buildLearnPathView(progress);
    const check = path.units[0]?.lessons.find((l) => l.id === "rtl-baseline-checkpoint");
    expect(check?.kind ?? "CHECKPOINT").toBeDefined();
    expect(check?.status).toBe("AVAILABLE");
    expect(path.nextLessonId).toBe("rtl-baseline-checkpoint");
  });

  it("orders previous lesson across units including checkpoints", () => {
    expect(previousLessonId("rtl-baseline-lesson-1")).toBeNull();
    expect(previousLessonId("letter-families-i-lesson-1")).toBe("rtl-baseline-checkpoint");
    expect(ACTIVE_LESSONS).toHaveLength(72);
    expect(orderedActiveLessons().filter((lesson) => lesson.kind === "CHECKPOINT")).toHaveLength(8);
  });

  it("requires 60% for completion threshold", () => {
    expect(isLessonComplete(5, 8)).toBe(true);
    expect(isLessonComplete(4, 8)).toBe(false);
  });
});
