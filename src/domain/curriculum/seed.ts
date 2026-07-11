import type { KnowledgeAtom } from "@/domain/learning/types";

export const BEGINNER_ATOMS: KnowledgeAtom[] = [
  { id: "letter-ba", kind: "LETTER", register: "MSA", canonicalArabic: "ب", vocalizedArabic: "بَ", englishGloss: "letter baa", prerequisiteIds: [], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-bab", kind: "WORD", register: "MSA", canonicalArabic: "باب", vocalizedArabic: "بَاب", englishGloss: "door", prerequisiteIds: ["letter-ba"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-bayt", kind: "WORD", register: "MSA", canonicalArabic: "بيت", vocalizedArabic: "بَيْت", englishGloss: "house", prerequisiteIds: ["letter-ba"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-kitab", kind: "WORD", register: "MSA", canonicalArabic: "كتاب", vocalizedArabic: "كِتَاب", englishGloss: "book", prerequisiteIds: ["letter-ba"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-maktaba", kind: "WORD", register: "MSA", canonicalArabic: "مكتبة", vocalizedArabic: "مَكْتَبَة", englishGloss: "library", prerequisiteIds: ["word-kitab"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "pronoun-ana", kind: "WORD", register: "MSA", canonicalArabic: "أنا", vocalizedArabic: "أَنَا", englishGloss: "I", prerequisiteIds: [], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "verb-ataallam", kind: "WORD", register: "MSA", canonicalArabic: "أتعلم", vocalizedArabic: "أَتَعَلَّمُ", englishGloss: "I learn", prerequisiteIds: ["pronoun-ana"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "phrase-learn-arabic", kind: "CONSTRUCTION", register: "MSA", canonicalArabic: "أنا أتعلم العربية", vocalizedArabic: "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ", englishGloss: "I am learning Arabic", prerequisiteIds: ["pronoun-ana", "verb-ataallam"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
];
