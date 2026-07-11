import { BEGINNER_ATOMS } from "./seed";
import { INPUT_PASSAGES } from "./passages";
import { LETTER_ATOMS } from "./letters";

describe("BEGINNER_ATOMS", () => {
  it("has unique ids and only points to earlier prerequisites", () => {
    const seen = new Set<string>();
    for (const atom of BEGINNER_ATOMS) {
      expect(seen.has(atom.id), `duplicate id ${atom.id}`).toBe(false);
      for (const id of atom.prerequisiteIds) {
        expect(seen.has(id), `${atom.id} missing prereq ${id}`).toBe(true);
      }
      seen.add(atom.id);
    }
  });

  it("is a serious beginner spine: full abjad + dense lexicon", () => {
    expect(BEGINNER_ATOMS.length).toBeGreaterThanOrEqual(180);
    expect(LETTER_ATOMS.filter((a) => a.kind === "LETTER").length).toBeGreaterThanOrEqual(28);

    const letters = BEGINNER_ATOMS.filter((a) => a.kind === "LETTER");
    const words = BEGINNER_ATOMS.filter((a) => a.kind === "WORD");
    const grammar = BEGINNER_ATOMS.filter((a) => a.kind === "GRAMMAR");
    const constructions = BEGINNER_ATOMS.filter((a) => a.kind === "CONSTRUCTION");

    expect(letters.length).toBeGreaterThanOrEqual(28);
    expect(words.length).toBeGreaterThanOrEqual(100);
    expect(grammar.length).toBeGreaterThanOrEqual(15);
    expect(constructions.length).toBeGreaterThanOrEqual(30);

    for (const atom of BEGINNER_ATOMS) {
      expect(atom.register).toBe("MSA");
      expect(atom.vocalizedArabic.length).toBeGreaterThan(0);
      expect(atom.canonicalArabic.length).toBeGreaterThan(0);
    }
  });

  it("includes multiple production paths beyond letter-ba", () => {
    expect(BEGINNER_ATOMS.some((a) => a.id === "phrase-learn-arabic")).toBe(true);
    expect(BEGINNER_ATOMS.some((a) => a.id === "phrase-in-house")).toBe(true);
    expect(BEGINNER_ATOMS.some((a) => a.id === "phrase-i-speak-arabic")).toBe(true);
    expect(BEGINNER_ATOMS.some((a) => a.id === "letter-tha")).toBe(true);
    expect(BEGINNER_ATOMS.some((a) => a.id === "letter-qaf")).toBe(true);
  });
});

describe("INPUT_PASSAGES", () => {
  it("provides a large graded reading bank linked to known atoms", () => {
    expect(INPUT_PASSAGES.length).toBeGreaterThanOrEqual(25);
    const ids = new Set(BEGINNER_ATOMS.map((a) => a.id));
    for (const passage of INPUT_PASSAGES) {
      expect(passage.arabic.length).toBeGreaterThan(0);
      expect(passage.english.length).toBeGreaterThan(0);
      expect(passage.atomIds.length).toBeGreaterThan(0);
      for (const id of passage.atomIds) {
        expect(ids.has(id), `passage references missing atom ${id}`).toBe(true);
      }
    }
  });
});
