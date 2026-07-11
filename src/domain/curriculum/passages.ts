export interface InputPassage {
  atomIds: string[];
  arabic: string;
  english: string;
}

/** Graded MSA reading snippets for Study Room Input stage (≥25). */
export const INPUT_PASSAGES: InputPassage[] = [
  { atomIds: ["phrase-learn-arabic", "word-arabiyya"], arabic: "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ كُلَّ صَبَاحٍ.", english: "I learn Arabic every morning." },
  { atomIds: ["phrase-in-house", "word-bayt"], arabic: "الكِتابُ فِي البَيْتِ.", english: "The book is in the house." },
  { atomIds: ["phrase-i-write-book", "word-kitab"], arabic: "أَكْتُبُ كِتاباً فِي المَكْتَبَةِ.", english: "I write a book in the library." },
  { atomIds: ["word-marhaba", "pronoun-ana"], arabic: "مَرْحَباً، أَنا أَتَعَلَّمُ.", english: "Hello — I am learning." },
  { atomIds: ["phrase-what-is-your-name", "word-ism"], arabic: "ما اسْمُكَ؟ اِسْمِي سارة.", english: "What is your name? My name is Sara." },
  { atomIds: ["phrase-good-morning", "word-sabah"], arabic: "صَباحُ الخَيْرِ! كَيْفَ حالُكَ؟", english: "Good morning! How are you?" },
  { atomIds: ["phrase-i-drink-water", "word-maa"], arabic: "أَشْرَبُ ماءً بارِداً.", english: "I drink cold water." },
  { atomIds: ["phrase-i-want-coffee", "word-qahwa"], arabic: "أُرِيدُ قَهْوَةً مِنْ فَضْلِكَ.", english: "I want coffee, please." },
  { atomIds: ["phrase-i-go-to-school", "word-madrasa"], arabic: "أَذْهَبُ إِلى المَدْرَسَةِ كُلَّ يَوْمٍ.", english: "I go to school every day." },
  { atomIds: ["phrase-in-library", "word-maktaba"], arabic: "الطّالِبُ فِي المَكْتَبَةِ.", english: "The student is in the library." },
  { atomIds: ["phrase-i-speak-arabic", "verb-atakallam"], arabic: "أَتَكَلَّمُ العَرَبِيَّةَ قَلِيلاً.", english: "I speak a little Arabic." },
  { atomIds: ["phrase-i-dont-understand", "verb-afham"], arabic: "عَفْواً، لا أَفْهَمُ.", english: "Excuse me, I do not understand." },
  { atomIds: ["phrase-the-book-is-new", "word-jadid"], arabic: "هٰذا كِتابٌ جَدِيدٌ.", english: "This is a new book." },
  { atomIds: ["phrase-the-house-is-big", "word-kabir"], arabic: "البَيْتُ كَبِيرٌ وَجَمِيلٌ.", english: "The house is big and beautiful." },
  { atomIds: ["phrase-with-friend", "word-sadiq"], arabic: "أَذْهَبُ مَعَ صَدِيقِي إِلى السُّوقِ.", english: "I go with my friend to the market." },
  { atomIds: ["phrase-from-city", "word-madina"], arabic: "أَنا مِنَ المَدِينَةِ.", english: "I am from the city." },
  { atomIds: ["phrase-today-i-study", "word-al-yawm"], arabic: "اليَوْمَ أَقْرَأُ دَرْساً مُهِمّاً.", english: "Today I read an important lesson." },
  { atomIds: ["phrase-tomorrow-i-go", "word-ghadan"], arabic: "غَداً أَذْهَبُ إِلى الجامِعَةِ.", english: "Tomorrow I go to the university." },
  { atomIds: ["phrase-i-like-coffee", "verb-uhibb"], arabic: "أُحِبُّ الشّايَ وَالقَهْوَةَ.", english: "I like tea and coffee." },
  { atomIds: ["phrase-arabic-is-beautiful", "word-jamiil"], arabic: "العَرَبِيَّةُ لُغَةٌ جَمِيلَةٌ.", english: "Arabic is a beautiful language." },
  { atomIds: ["phrase-is-this-easy", "word-sahl"], arabic: "هَلْ هٰذا الدَّرْسُ سَهْلٌ؟", english: "Is this lesson easy?" },
  { atomIds: ["phrase-where-is-the-house", "grammar-ayna-where"], arabic: "أَيْنَ المَطْعَمُ؟", english: "Where is the restaurant?" },
  { atomIds: ["phrase-student-of-arabic", "word-talib"], arabic: "هِيَ طالِبَةُ العَرَبِيَّةِ.", english: "She is a student of Arabic." },
  { atomIds: ["phrase-on-the-table", "word-maktab"], arabic: "القَلَمُ عَلى المَكْتَبِ.", english: "The pen is on the desk." },
  { atomIds: ["phrase-with-the-family", "word-usra"], arabic: "أَسْكُنُ مَعَ الأُسْرَةِ.", english: "I live with the family." },
  { atomIds: ["phrase-i-hear-and-speak", "verb-asma3"], arabic: "أَسْمَعُ وَأَقْرَأُ وَأَكْتُبُ.", english: "I listen, read, and write." },
  { atomIds: ["phrase-how-many-books", "grammar-kam-how-many"], arabic: "كَمْ كِتاباً عِنْدَكَ؟", english: "How many books do you have?" },
  { atomIds: ["word-shams", "word-qamar"], arabic: "الشَّمْسُ فِي السَّماءِ وَالقَمَرُ فِي اللَّيْلِ.", english: "The sun is in the sky and the moon is at night." },
  { atomIds: ["word-maa", "word-khubz", "word-ta3am"], arabic: "أُرِيدُ ماءً وَخُبْزاً وَطَعاماً.", english: "I want water, bread, and food." },
  { atomIds: ["phrase-please-and-thanks", "word-shukran"], arabic: "مِنْ فَضْلِكَ، أَيْنَ الفُنْدُقُ؟ شُكْراً.", english: "Please, where is the hotel? Thank you." },
  { atomIds: ["word-safar", "word-matar", "word-taira"], arabic: "أُرِيدُ سَفَراً. الطّائِرَةُ فِي المَطارِ.", english: "I want a trip. The plane is at the airport." },
  { atomIds: ["phrase-i-work-in", "word-maktab"], arabic: "أَعْمَلُ فِي مَكْتَبٍ كَبِيرٍ.", english: "I work in a big office." },
  { atomIds: ["word-layl", "word-sabah"], arabic: "فِي الصَّباحِ أَدْرُسُ وَفِي اللَّيْلِ أَنامُ.", english: "In the morning I study and at night I sleep." },
  { atomIds: ["grammar-hadha-hadhihi", "word-qalam"], arabic: "هٰذا قَلَمٌ وَهٰذِهِ دَفْتَرٌ.", english: "This is a pen and this is a notebook." },
  { atomIds: ["word-bahr", "word-jabal"], arabic: "أُحِبُّ البَحْرَ وَالجَبَلَ.", english: "I love the sea and the mountain." },
];
