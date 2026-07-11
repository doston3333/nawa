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
    expect(BEGINNER_ATOMS.length).toBeGreaterThanOrEqual(30);
    expect(BEGINNER_ATOMS.length).toBeLessThanOrEqual(60);
    for (const atom of BEGINNER_ATOMS) {
      expect(atom.register).toBe("MSA");
      expect(atom.vocalizedArabic.length).toBeGreaterThan(0);
      expect(atom.canonicalArabic.length).toBeGreaterThan(0);
    }
  });

  it("includes more than one lesson path beyond letter-ba", () => {
    const words = BEGINNER_ATOMS.filter((atom) => atom.kind === "WORD" || atom.kind === "CONSTRUCTION");
    expect(words.length).toBeGreaterThanOrEqual(12);
    expect(BEGINNER_ATOMS.some((atom) => atom.id === "phrase-learn-arabic")).toBe(true);
    expect(BEGINNER_ATOMS.some((atom) => atom.id === "phrase-in-house")).toBe(true);
  });
});
