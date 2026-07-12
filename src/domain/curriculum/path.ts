import type { LessonDef, UnitDef } from "@/domain/learning/types";
export { ACTIVE_COURSE } from "@/domain/course/catalog";
import { tipsForLesson } from "./tips";

const L = (ids: string[]) => ids;

function lesson(
  partial: Omit<LessonDef, "tips"> & { tips?: string[] },
): LessonDef {
  const tips = partial.tips ?? tipsForLesson(partial.id);
  return { ...partial, tips, kind: partial.kind ?? "LESSON" };
}

function checkpoint(
  unitId: string,
  title: string,
  atomIds: string[],
  order: number,
): LessonDef {
  const id = `${unitId}-check`;
  return lesson({
    id,
    unitId,
    title,
    order,
    exerciseCount: 10,
    atomIds,
    kind: "CHECKPOINT",
    tips: tipsForLesson(id),
  });
}

const scriptAtoms = [
  "letter-alif", "letter-ba", "letter-ta", "letter-tha", "letter-jim", "letter-haa", "letter-kha",
  "letter-dal", "letter-dhal", "letter-ra", "letter-zay", "letter-sin", "letter-shin", "letter-sad",
  "letter-dad", "letter-taa", "letter-zaa", "letter-ain", "letter-ghain", "letter-fa", "letter-qaf",
  "letter-kaf", "letter-lam", "letter-mim", "letter-nun", "letter-ha", "letter-waw", "letter-ya", "letter-hamza",
];

export const LESSONS: LessonDef[] = [
  // Unit 1 — Script
  lesson({ id: "script-1", unitId: "script", title: "Letters 1–7", order: 1, exerciseCount: 8, atomIds: L(["letter-alif", "letter-ba", "letter-ta", "letter-tha", "letter-jim", "letter-haa", "letter-kha"]) }),
  lesson({ id: "script-2", unitId: "script", title: "Letters 8–14", order: 2, exerciseCount: 8, atomIds: L(["letter-dal", "letter-dhal", "letter-ra", "letter-zay", "letter-sin", "letter-shin", "letter-sad"]) }),
  lesson({ id: "script-3", unitId: "script", title: "Letters 15–21", order: 3, exerciseCount: 8, atomIds: L(["letter-dad", "letter-taa", "letter-zaa", "letter-ain", "letter-ghain", "letter-fa", "letter-qaf"]) }),
  lesson({ id: "script-4", unitId: "script", title: "Letters 22–28 + hamza", order: 4, exerciseCount: 8, atomIds: L(["letter-kaf", "letter-lam", "letter-mim", "letter-nun", "letter-ha", "letter-waw", "letter-ya", "letter-hamza"]) }),
  checkpoint("script", "Script checkpoint", scriptAtoms, 5),

  // Unit 2 — Greetings
  lesson({ id: "greetings-1", unitId: "greetings", title: "Hello & peace", order: 1, exerciseCount: 8, atomIds: L(["word-marhaba", "word-salam", "word-ahlan"]) }),
  lesson({ id: "greetings-2", unitId: "greetings", title: "Thanks & please", order: 2, exerciseCount: 8, atomIds: L(["word-shukran", "word-afwan", "word-min-fadlik"]) }),
  lesson({ id: "greetings-3", unitId: "greetings", title: "Yes, no, good day", order: 3, exerciseCount: 8, atomIds: L(["word-naam", "word-la", "phrase-good-morning", "phrase-good-evening"]) }),
  checkpoint("greetings", "Greetings checkpoint", ["word-marhaba", "word-salam", "word-shukran", "word-afwan", "word-naam", "word-la", "phrase-good-morning"], 4),

  // Unit 3 — Identity
  lesson({ id: "identity-1", unitId: "identity", title: "I and you", order: 1, exerciseCount: 8, atomIds: L(["pronoun-ana", "pronoun-anta", "pronoun-anti"]) }),
  lesson({ id: "identity-2", unitId: "identity", title: "He, she, we", order: 2, exerciseCount: 8, atomIds: L(["pronoun-huwa", "pronoun-hiya", "pronoun-nahnu", "pronoun-hum"]) }),
  lesson({ id: "identity-3", unitId: "identity", title: "Names", order: 3, exerciseCount: 8, atomIds: L(["word-ism", "word-ismi", "phrase-my-name", "phrase-what-is-your-name"]) }),
  checkpoint("identity", "Identity checkpoint", ["pronoun-ana", "pronoun-anta", "pronoun-huwa", "pronoun-hiya", "word-ism", "phrase-my-name"], 4),

  // Unit 4 — Home
  lesson({ id: "home-1", unitId: "home", title: "House & door", order: 1, exerciseCount: 8, atomIds: L(["word-bayt", "word-bab", "word-ghurfa"]) }),
  lesson({ id: "home-2", unitId: "home", title: "In the house", order: 2, exerciseCount: 8, atomIds: L(["particle-fi", "grammar-al", "phrase-in-house"]) }),
  lesson({ id: "home-3", unitId: "home", title: "Desk & library", order: 3, exerciseCount: 8, atomIds: L(["word-maktab", "word-maktaba", "phrase-in-library", "phrase-on-the-table"]) }),
  checkpoint("home", "Home checkpoint", ["word-bayt", "word-bab", "particle-fi", "grammar-al", "word-maktaba", "phrase-in-house"], 4),

  // Unit 5 — People
  lesson({ id: "people-1", unitId: "people", title: "Man, woman, child", order: 1, exerciseCount: 8, atomIds: L(["word-rajul", "word-marah", "word-walad", "word-bint"]) }),
  lesson({ id: "people-2", unitId: "people", title: "Family", order: 2, exerciseCount: 8, atomIds: L(["word-ab", "word-umm", "word-akh", "word-ukht", "word-usra"]) }),
  lesson({ id: "people-3", unitId: "people", title: "Teacher & friend", order: 3, exerciseCount: 8, atomIds: L(["word-ustadh", "word-talib", "word-sadiq", "phrase-with-friend"]) }),
  checkpoint("people", "People checkpoint", ["word-rajul", "word-bint", "word-ab", "word-umm", "word-talib", "word-sadiq"], 4),

  // Unit 6 — Study
  lesson({ id: "study-1", unitId: "study", title: "Book & pen", order: 1, exerciseCount: 8, atomIds: L(["word-kitab", "word-qalam", "word-daftar", "word-dars"]) }),
  lesson({ id: "study-2", unitId: "study", title: "I read & write", order: 2, exerciseCount: 8, atomIds: L(["verb-aqra", "verb-aktub", "phrase-i-read-book", "phrase-i-write-book"]) }),
  lesson({ id: "study-3", unitId: "study", title: "I learn Arabic", order: 3, exerciseCount: 8, atomIds: L(["verb-ataallam", "word-arabiyya", "word-lugha", "phrase-learn-arabic"]) }),
  lesson({ id: "study-4", unitId: "study", title: "Understand & speak", order: 4, exerciseCount: 8, atomIds: L(["verb-afham", "verb-atakallam", "phrase-i-dont-understand", "phrase-i-speak-arabic"]) }),
  checkpoint("study", "Study checkpoint", ["word-kitab", "verb-aqra", "verb-aktub", "verb-ataallam", "phrase-learn-arabic", "phrase-i-speak-arabic"], 5),

  // Unit 7 — Daily life
  lesson({ id: "daily-1", unitId: "daily", title: "Food & drink", order: 1, exerciseCount: 8, atomIds: L(["word-maa", "word-qahwa", "word-khubz", "word-ta3am", "verb-ashrab", "verb-akul"]) }),
  lesson({ id: "daily-2", unitId: "daily", title: "I want…", order: 2, exerciseCount: 8, atomIds: L(["verb-uriid", "phrase-i-want-coffee", "phrase-i-drink-water", "phrase-i-eat-bread"]) }),
  lesson({ id: "daily-3", unitId: "daily", title: "Time of day", order: 3, exerciseCount: 8, atomIds: L(["word-yawm", "word-sabah", "word-masa", "word-al-yawm", "word-ghadan"]) }),
  lesson({ id: "daily-4", unitId: "daily", title: "Go & live", order: 4, exerciseCount: 8, atomIds: L(["verb-adhhab", "verb-askun", "phrase-i-go-to-school", "phrase-i-live-in"]) }),
  checkpoint("daily", "Daily life checkpoint", ["word-maa", "verb-uriid", "word-sabah", "verb-adhhab", "phrase-i-want-coffee", "phrase-i-go-to-school"], 5),

  // Unit 8 — First sentences
  lesson({ id: "sentences-1", unitId: "sentences", title: "This & that", order: 1, exerciseCount: 8, atomIds: L(["grammar-hadha-hadhihi", "phrase-this-is-a-book", "phrase-that-is-a-school"]) }),
  lesson({ id: "sentences-2", unitId: "sentences", title: "Where & when", order: 2, exerciseCount: 8, atomIds: L(["grammar-ayna-where", "grammar-mata-when", "phrase-where-is-the-house"]) }),
  lesson({ id: "sentences-3", unitId: "sentences", title: "Describe things", order: 3, exerciseCount: 8, atomIds: L(["word-kabir", "word-jadid", "word-jamiil", "phrase-the-house-is-big", "phrase-the-book-is-new"]) }),
  lesson({ id: "sentences-4", unitId: "sentences", title: "Put it together", order: 4, exerciseCount: 8, atomIds: L(["phrase-arabic-is-beautiful", "phrase-today-i-study", "phrase-i-hear-and-speak", "phrase-welcome-to-nawa"]) }),
  checkpoint("sentences", "Sentences checkpoint", ["phrase-this-is-a-book", "phrase-where-is-the-house", "phrase-the-house-is-big", "phrase-that-is-a-school", "phrase-arabic-is-beautiful", "phrase-today-i-study"], 5),
];

export const UNITS: UnitDef[] = [
  { id: "script", title: "Script", subtitle: "The Arabic letters", order: 1, lessonIds: ["script-1", "script-2", "script-3", "script-4", "script-check"] },
  { id: "greetings", title: "Greetings", subtitle: "Say hello and thank you", order: 2, lessonIds: ["greetings-1", "greetings-2", "greetings-3", "greetings-check"] },
  { id: "identity", title: "Identity", subtitle: "Pronouns and your name", order: 3, lessonIds: ["identity-1", "identity-2", "identity-3", "identity-check"] },
  { id: "home", title: "Home", subtitle: "House, room, library", order: 4, lessonIds: ["home-1", "home-2", "home-3", "home-check"] },
  { id: "people", title: "People", subtitle: "Family, friends, school", order: 5, lessonIds: ["people-1", "people-2", "people-3", "people-check"] },
  { id: "study", title: "Study", subtitle: "Books, reading, Arabic", order: 6, lessonIds: ["study-1", "study-2", "study-3", "study-4", "study-check"] },
  { id: "daily", title: "Daily life", subtitle: "Food, time, going places", order: 7, lessonIds: ["daily-1", "daily-2", "daily-3", "daily-4", "daily-check"] },
  { id: "sentences", title: "First sentences", subtitle: "Build real MSA lines", order: 8, lessonIds: ["sentences-1", "sentences-2", "sentences-3", "sentences-4", "sentences-check"] },
];

export function getLessonById(id: string): LessonDef | undefined {
  return LESSONS.find((item) => item.id === id);
}

export function orderedLessons(): LessonDef[] {
  return [...LESSONS].sort((a, b) => {
    const unitA = UNITS.find((u) => u.id === a.unitId)?.order ?? 0;
    const unitB = UNITS.find((u) => u.id === b.unitId)?.order ?? 0;
    return unitA - unitB || a.order - b.order;
  });
}

export function nextLessonId(currentId: string): string | null {
  const all = orderedLessons();
  const index = all.findIndex((item) => item.id === currentId);
  if (index < 0 || index >= all.length - 1) return null;
  return all[index + 1]?.id ?? null;
}

export function unitLessons(unitId: string): LessonDef[] {
  return LESSONS.filter((item) => item.unitId === unitId).sort((a, b) => a.order - b.order);
}

export function checkpointCount(): number {
  return LESSONS.filter((item) => item.kind === "CHECKPOINT").length;
}
