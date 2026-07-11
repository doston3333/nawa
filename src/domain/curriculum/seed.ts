import type { KnowledgeAtom } from "@/domain/learning/types";

const ALL: AbilityBundle = ["READING", "LISTENING", "WRITING", "SPEAKING"];
type AbilityBundle = KnowledgeAtom["abilities"];

function atom(
  partial: Omit<KnowledgeAtom, "register" | "abilities"> & { abilities?: AbilityBundle },
): KnowledgeAtom {
  return { register: "MSA", abilities: partial.abilities ?? ALL, ...partial };
}

/**
 * High-utility beginner MSA spine (~40 atoms) for the public Study Room demo.
 * Ordered so prerequisites only point to earlier ids.
 */
export const BEGINNER_ATOMS: KnowledgeAtom[] = [
  // Letters
  atom({ id: "letter-alif", kind: "LETTER", canonicalArabic: "ا", vocalizedArabic: "ا", englishGloss: "letter alif", prerequisiteIds: [] }),
  atom({ id: "letter-ba", kind: "LETTER", canonicalArabic: "ب", vocalizedArabic: "بَ", englishGloss: "letter baa", prerequisiteIds: [] }),
  atom({ id: "letter-ta", kind: "LETTER", canonicalArabic: "ت", vocalizedArabic: "تَ", englishGloss: "letter taa", prerequisiteIds: [] }),
  atom({ id: "letter-jim", kind: "LETTER", canonicalArabic: "ج", vocalizedArabic: "جَ", englishGloss: "letter jeem", prerequisiteIds: [] }),
  atom({ id: "letter-dal", kind: "LETTER", canonicalArabic: "د", vocalizedArabic: "دَ", englishGloss: "letter dal", prerequisiteIds: [] }),
  atom({ id: "letter-ra", kind: "LETTER", canonicalArabic: "ر", vocalizedArabic: "رَ", englishGloss: "letter raa", prerequisiteIds: [] }),
  atom({ id: "letter-sin", kind: "LETTER", canonicalArabic: "س", vocalizedArabic: "سَ", englishGloss: "letter seen", prerequisiteIds: [] }),
  atom({ id: "letter-ain", kind: "LETTER", canonicalArabic: "ع", vocalizedArabic: "عَ", englishGloss: "letter ʿayn", prerequisiteIds: [] }),
  atom({ id: "letter-fa", kind: "LETTER", canonicalArabic: "ف", vocalizedArabic: "فَ", englishGloss: "letter faa", prerequisiteIds: [] }),
  atom({ id: "letter-kaf", kind: "LETTER", canonicalArabic: "ك", vocalizedArabic: "كَ", englishGloss: "letter kaf", prerequisiteIds: [] }),
  atom({ id: "letter-lam", kind: "LETTER", canonicalArabic: "ل", vocalizedArabic: "لَ", englishGloss: "letter lam", prerequisiteIds: [] }),
  atom({ id: "letter-mim", kind: "LETTER", canonicalArabic: "م", vocalizedArabic: "مَ", englishGloss: "letter meem", prerequisiteIds: [] }),
  atom({ id: "letter-nun", kind: "LETTER", canonicalArabic: "ن", vocalizedArabic: "نَ", englishGloss: "letter nun", prerequisiteIds: [] }),
  atom({ id: "letter-ha", kind: "LETTER", canonicalArabic: "ه", vocalizedArabic: "هَ", englishGloss: "letter haa", prerequisiteIds: [] }),
  atom({ id: "letter-waw", kind: "LETTER", canonicalArabic: "و", vocalizedArabic: "وَ", englishGloss: "letter waw", prerequisiteIds: [] }),
  atom({ id: "letter-ya", kind: "LETTER", canonicalArabic: "ي", vocalizedArabic: "يَ", englishGloss: "letter yaa", prerequisiteIds: [] }),

  // Core words
  atom({ id: "word-bab", kind: "WORD", canonicalArabic: "باب", vocalizedArabic: "بَاب", englishGloss: "door", prerequisiteIds: ["letter-ba"], root: "ب و ب" }),
  atom({ id: "word-bayt", kind: "WORD", canonicalArabic: "بيت", vocalizedArabic: "بَيْت", englishGloss: "house", prerequisiteIds: ["letter-ba", "letter-ya"], root: "ب ي ت" }),
  atom({ id: "word-kitab", kind: "WORD", canonicalArabic: "كتاب", vocalizedArabic: "كِتَاب", englishGloss: "book", prerequisiteIds: ["letter-kaf", "letter-ta"], root: "ك ت ب", patternNote: "fiʿāl noun pattern" }),
  atom({ id: "word-maktaba", kind: "WORD", canonicalArabic: "مكتبة", vocalizedArabic: "مَكْتَبَة", englishGloss: "library", prerequisiteIds: ["word-kitab"], root: "ك ت ب", patternNote: "mafʿala place noun" }),
  atom({ id: "word-qalam", kind: "WORD", canonicalArabic: "قلم", vocalizedArabic: "قَلَم", englishGloss: "pen", prerequisiteIds: ["letter-lam", "letter-mim"] }),
  atom({ id: "word-ism", kind: "WORD", canonicalArabic: "اسم", vocalizedArabic: "اِسْم", englishGloss: "name", prerequisiteIds: ["letter-alif", "letter-sin", "letter-mim"] }),
  atom({ id: "word-walad", kind: "WORD", canonicalArabic: "ولد", vocalizedArabic: "وَلَد", englishGloss: "boy", prerequisiteIds: ["letter-waw", "letter-lam"] }),
  atom({ id: "word-bint", kind: "WORD", canonicalArabic: "بنت", vocalizedArabic: "بِنْت", englishGloss: "girl", prerequisiteIds: ["letter-ba", "letter-nun"] }),
  atom({ id: "word-rajul", kind: "WORD", canonicalArabic: "رجل", vocalizedArabic: "رَجُل", englishGloss: "man", prerequisiteIds: ["letter-ra", "letter-jim"] }),
  atom({ id: "word-marah", kind: "WORD", canonicalArabic: "مرأة", vocalizedArabic: "مَرْأَة", englishGloss: "woman", prerequisiteIds: ["letter-mim", "letter-ra"] }),
  atom({ id: "word-yawm", kind: "WORD", canonicalArabic: "يوم", vocalizedArabic: "يَوْم", englishGloss: "day", prerequisiteIds: ["letter-ya", "letter-waw"] }),
  atom({ id: "word-layl", kind: "WORD", canonicalArabic: "ليل", vocalizedArabic: "لَيْل", englishGloss: "night", prerequisiteIds: ["letter-lam", "letter-ya"] }),
  atom({ id: "word-maa", kind: "WORD", canonicalArabic: "ماء", vocalizedArabic: "مَاء", englishGloss: "water", prerequisiteIds: ["letter-mim"] }),
  atom({ id: "word-qahwa", kind: "WORD", canonicalArabic: "قهوة", vocalizedArabic: "قَهْوَة", englishGloss: "coffee", prerequisiteIds: ["letter-ha", "letter-waw"] }),
  atom({ id: "word-shukran", kind: "WORD", canonicalArabic: "شكرا", vocalizedArabic: "شُكْرًا", englishGloss: "thank you", prerequisiteIds: ["letter-ra"] }),
  atom({ id: "word-marhaba", kind: "WORD", canonicalArabic: "مرحبا", vocalizedArabic: "مَرْحَبًا", englishGloss: "hello / welcome", prerequisiteIds: ["letter-mim", "letter-ra", "letter-ha"] }),

  // Pronouns & particles
  atom({ id: "pronoun-ana", kind: "WORD", canonicalArabic: "أنا", vocalizedArabic: "أَنَا", englishGloss: "I", prerequisiteIds: ["letter-alif", "letter-nun"] }),
  atom({ id: "pronoun-anta", kind: "WORD", canonicalArabic: "أنت", vocalizedArabic: "أَنْتَ", englishGloss: "you (m. sg.)", prerequisiteIds: ["letter-alif", "letter-nun", "letter-ta"] }),
  atom({ id: "pronoun-hiya", kind: "WORD", canonicalArabic: "هي", vocalizedArabic: "هِيَ", englishGloss: "she", prerequisiteIds: ["letter-ha", "letter-ya"] }),
  atom({ id: "pronoun-huwa", kind: "WORD", canonicalArabic: "هو", vocalizedArabic: "هُوَ", englishGloss: "he", prerequisiteIds: ["letter-ha", "letter-waw"] }),
  atom({ id: "particle-fi", kind: "WORD", canonicalArabic: "في", vocalizedArabic: "فِي", englishGloss: "in", prerequisiteIds: ["letter-fa", "letter-ya"] }),
  atom({ id: "particle-min", kind: "WORD", canonicalArabic: "من", vocalizedArabic: "مِنْ", englishGloss: "from", prerequisiteIds: ["letter-mim", "letter-nun"] }),
  atom({ id: "particle-wa", kind: "WORD", canonicalArabic: "و", vocalizedArabic: "وَ", englishGloss: "and", prerequisiteIds: ["letter-waw"] }),

  // Verbs & constructions
  atom({ id: "verb-ataallam", kind: "WORD", canonicalArabic: "أتعلم", vocalizedArabic: "أَتَعَلَّمُ", englishGloss: "I learn", prerequisiteIds: ["pronoun-ana", "letter-ain", "letter-lam", "letter-mim"], root: "ع ل م" }),
  atom({ id: "verb-aktub", kind: "WORD", canonicalArabic: "أكتب", vocalizedArabic: "أَكْتُبُ", englishGloss: "I write", prerequisiteIds: ["pronoun-ana", "word-kitab"], root: "ك ت ب" }),
  atom({ id: "verb-aqra", kind: "WORD", canonicalArabic: "أقرأ", vocalizedArabic: "أَقْرَأُ", englishGloss: "I read", prerequisiteIds: ["pronoun-ana", "letter-ra"], root: "ق ر أ" }),
  atom({ id: "word-arabiyya", kind: "WORD", canonicalArabic: "العربية", vocalizedArabic: "العَرَبِيَّةَ", englishGloss: "Arabic (language)", prerequisiteIds: ["letter-ain", "letter-ra", "letter-ba"] }),
  atom({ id: "phrase-learn-arabic", kind: "CONSTRUCTION", canonicalArabic: "أنا أتعلم العربية", vocalizedArabic: "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ", englishGloss: "I am learning Arabic", prerequisiteIds: ["pronoun-ana", "verb-ataallam", "word-arabiyya"] }),
  atom({ id: "phrase-in-house", kind: "CONSTRUCTION", canonicalArabic: "في البيت", vocalizedArabic: "فِي البَيْتِ", englishGloss: "in the house", prerequisiteIds: ["particle-fi", "word-bayt"] }),
  atom({ id: "phrase-my-name", kind: "CONSTRUCTION", canonicalArabic: "اسمي", vocalizedArabic: "اِسْمِي", englishGloss: "my name", prerequisiteIds: ["word-ism"] }),
  atom({ id: "phrase-write-book", kind: "CONSTRUCTION", canonicalArabic: "أكتب كتابا", vocalizedArabic: "أَكْتُبُ كِتَابًا", englishGloss: "I write a book", prerequisiteIds: ["verb-aktub", "word-kitab"] }),
];

export function getAtomById(id: string): KnowledgeAtom | undefined {
  return BEGINNER_ATOMS.find((atom) => atom.id === id);
}

export function atomIndexById(): Map<string, KnowledgeAtom> {
  return new Map(BEGINNER_ATOMS.map((atom) => [atom.id, atom]));
}
