import { BEGINNER_ATOMS } from "./seed";

describe("BEGINNER_ATOMS", () => {
  it("has unique ids and only points to earlier prerequisites", () => {
    const seen = new Set<string>();
    for (const atom of BEGINNER_ATOMS) {
      expect(seen.has(atom.id)).toBe(false);
      expect(atom.prerequisiteIds.every((id) => seen.has(id))).toBe(true);
      seen.add(atom.id);
    }
  });

  it("labels every atom as MSA and supplies vocalized Arabic", () => {
    expect(BEGINNER_ATOMS.length).toBeGreaterThanOrEqual(8);
    for (const atom of BEGINNER_ATOMS) {
      expect(atom.register).toBe("MSA");
      expect(atom.vocalizedArabic.length).toBeGreaterThan(0);
    }
  });
});
