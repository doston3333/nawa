import { tipsForLesson } from "./tips";
import { LESSONS } from "./path";

it("supplies non-empty MSA tips for every path lesson including checkpoints", () => {
  for (const lesson of LESSONS) {
    const tips = tipsForLesson(lesson.id);
    expect(tips.length).toBeGreaterThan(0);
    for (const tip of tips) {
      expect(tip.trim().length).toBeGreaterThan(20);
    }
  }
});
