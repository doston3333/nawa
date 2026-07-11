import type { KnowledgeAtom } from "@/domain/learning/types";
import { LETTER_ATOMS } from "./letters";
import { WORD_ATOMS } from "./words";
import { GRAMMAR_ATOMS } from "./grammar";
import { PHRASE_ATOMS } from "./phrases";

/**
 * Absolute beginner → early A1 MSA spine for the Study Room.
 * Order is topological: prerequisites only point to earlier ids.
 */
export const BEGINNER_ATOMS: KnowledgeAtom[] = [
  ...LETTER_ATOMS,
  ...WORD_ATOMS,
  ...GRAMMAR_ATOMS,
  ...PHRASE_ATOMS,
];

export function getAtomById(id: string): KnowledgeAtom | undefined {
  return BEGINNER_ATOMS.find((item) => item.id === id);
}

export function atomIndexById(): Map<string, KnowledgeAtom> {
  return new Map(BEGINNER_ATOMS.map((item) => [item.id, item]));
}

export { INPUT_PASSAGES } from "./passages";
export type { InputPassage } from "./passages";
