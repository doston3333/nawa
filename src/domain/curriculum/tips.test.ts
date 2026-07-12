import { LESSONS } from "./path";

it("supplies non-empty instructional tips for every active path lesson including checkpoints", () => {
  for (const lesson of LESSONS) {
    const tips = lesson.tips ?? [];
    expect(tips.length).toBeGreaterThan(0);
    for (const tip of tips) {
      expect(tip.trim().length).toBeGreaterThan(20);
    }
  }
});
