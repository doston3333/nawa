import { buildLearnPathView, isLessonComplete, previousLessonId } from "./unlock";
import { orderedLessons } from "@/domain/curriculum/path";

describe("lesson unlock chain", () => {
  it("opens only the first lesson with empty progress", () => {
    const path = buildLearnPathView([]);
    expect(path.nextLessonId).toBe("script-1");
    expect(path.units[0]?.lessons[0]?.status).toBe("AVAILABLE");
    expect(path.units[0]?.lessons[1]?.status).toBe("LOCKED");
    expect(path.units[1]?.lessons[0]?.status).toBe("LOCKED");
  });

  it("unlocks the next lesson after complete", () => {
    const path = buildLearnPathView([
      {
        lessonId: "script-1",
        status: "COMPLETE",
        scoreCorrect: 7,
        scoreTotal: 8,
        completedAt: "2026-07-12T00:00:00.000Z",
      },
    ]);
    expect(path.units[0]?.lessons[0]?.status).toBe("COMPLETE");
    expect(path.units[0]?.lessons[1]?.status).toBe("AVAILABLE");
    expect(path.nextLessonId).toBe("script-2");
  });

  it("unlocks the unit checkpoint after all regular unit lessons", () => {
    const scriptLessons = orderedLessons().filter((l) => l.unitId === "script" && l.kind !== "CHECKPOINT");
    const progress = scriptLessons.map((lesson) => ({
      lessonId: lesson.id,
      status: "COMPLETE" as const,
      scoreCorrect: 8,
      scoreTotal: 8,
      completedAt: "2026-07-12T00:00:00.000Z",
    }));
    const path = buildLearnPathView(progress);
    const check = path.units[0]?.lessons.find((l) => l.id === "script-check");
    expect(check?.kind ?? "CHECKPOINT").toBeDefined();
    expect(check?.status).toBe("AVAILABLE");
    expect(path.nextLessonId).toBe("script-check");
  });

  it("orders previous lesson across units including checkpoints", () => {
    expect(previousLessonId("script-1")).toBeNull();
    expect(previousLessonId("greetings-1")).toBe("script-check");
    expect(orderedLessons().length).toBeGreaterThanOrEqual(32);
    expect(orderedLessons().filter((l) => l.kind === "CHECKPOINT").length).toBe(8);
  });

  it("requires 60% for completion threshold", () => {
    expect(isLessonComplete(5, 8)).toBe(true);
    expect(isLessonComplete(4, 8)).toBe(false);
  });
});
