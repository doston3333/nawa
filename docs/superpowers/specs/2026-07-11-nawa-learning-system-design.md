# Nawa Learning System Design

**Status:** Approved product direction  
**Date:** 2026-07-11  
**Product:** Standalone consumer learning application  
**Initial scope:** Modern Standard Arabic from absolute beginner through a strong A1 foundation

## 1. Product vision

Nawa is a serious Arabic study environment that combines a structured Modern Standard Arabic curriculum with a personal bilingual notebook. It is not a generic notes application with AI translation, and it is not a conventional course with a notes tab. The curriculum supplies the learning sequence; the learner's notes, interests, mistakes, imported texts, and recordings supply personalized practice material.

The core promise is:

> Open Nawa, study seriously for one hour, and trust that every minute addresses what you most need next.

The product is designed for an adult beginner who studies for 30–60 focused minutes on most days and wants measurable improvement in reading, listening, writing, and speaking.

## 2. Goals and non-goals

### Goals

- Build accurate MSA reading and pronunciation from the script upward.
- Develop vocabulary that the learner can retrieve and use, not merely recognize.
- Turn personal notes and imported material into level-appropriate practice.
- Make rigorous daily study convenient without removing productive difficulty.
- Show progress as concrete abilities supported by evidence.
- Provide precise, bounded feedback and schedule future practice from observed errors.
- Create a calm adult learning experience without streak pressure or gamification.

### Non-goals for the initial product

- Teaching a spoken dialect alongside the beginner MSA sequence.
- Serving children or classroom cohorts.
- Acting as an unrestricted general-purpose AI chat assistant.
- Replacing teachers for advanced literary, religious, or dialectal study.
- Offering a social feed, competitive leaderboard, hearts, streaks, or virtual currency.
- Claiming a single percentage for fluency.

## 3. Chosen product model

Three models were considered:

1. **Curriculum-first course:** orderly and effective, but personal notes become peripheral.
2. **Notebook-first AI tutor:** convenient and personalized, but prone to gaps and unstructured vocabulary accumulation.
3. **Structured spine plus personal immersion:** a curriculum determines required mastery while personal material supplies meaningful context.

Nawa uses the third model. The curriculum graph is authoritative for progression. Personal content may change examples, topics, and practice contexts, but it cannot silently skip prerequisite knowledge.

## 4. Product principles

1. **Attempt before reveal.** Help appears through a ladder; complete answers are not the default.
2. **Retrieval over restudy.** Recognition alone never marks an item as mastered.
3. **One learning objective at a time.** The interface suppresses unrelated controls during focused work.
4. **Arabic first, English last.** Audio, diacritics, roots, and Arabic hints appear before full translation when the learner is ready.
5. **Personal context, controlled difficulty.** Imported content is adapted to the learner's level without corrupting its meaning.
6. **Explain uncertainty.** AI-generated analyses are validated and uncertain output is marked or withheld.
7. **No hidden dialect mixing.** Every non-MSA form is explicitly labeled.
8. **Ownership by default.** Notes and vocabulary remain exportable in usable formats.

## 5. Information architecture

Nawa has five primary destinations:

### Today

The learner's planned Study Room session, weekly objectives, and upcoming milestone assessment. It shows one primary action: continue today's study.

### Notebook

A bilingual, Arabic-aware note editor. Arabic words and phrases can become interactive Language Ink objects without changing the underlying note text.

### Reader

A focused environment for short stories, dialogues, pasted text, PDFs, scans, and transcripts. It provides synchronized audio, progressive diacritics, sentence looping, and controlled assistance.

### Practice

Speaking, listening, writing, handwriting, sentence construction, and targeted error repair. Practice is scheduled from the learner model rather than browsed as an undifferentiated exercise catalog.

### Memory

A transparent view of learned material organized by ability, root, pattern, topic, source, and retention state. It explains why an item is scheduled and what evidence supports its current status.

## 6. Learner model and mastery

### Knowledge atoms

The system tracks small instructional units:

- Letter identities and positional forms
- Phoneme distinctions and articulation targets
- Words and multiword phrases
- Roots and morphological patterns
- Grammar concepts
- Sentence constructions
- Listening distinctions
- Handwriting connections and stroke sequences

Each atom declares prerequisites, instructional examples, common confusions, valid assessment types, and the contexts in which it may appear.

### Ability dimensions

Mastery is tracked independently across:

- **Reading:** recognizing and interpreting unfamiliar written instances
- **Listening:** understanding the item in natural speech
- **Writing:** producing the correct form without copying
- **Speaking:** producing the item intelligibly in a new utterance

### Mastery states

Each ability moves through:

1. **Encountered:** the learner received an explanation or example.
2. **Recognized:** the learner identified it with contextual support.
3. **Retrieved:** the learner produced or recalled it without seeing the answer.
4. **Applied:** the learner used it correctly in a new context.
5. **Retained:** the learner retrieved and applied it after increasing delays.

An item can be retained in reading but only recognized in speaking. Nawa does not average these into a single fluency score.

### Evidence events

Every meaningful attempt records:

- Accuracy and accepted alternatives
- Response latency
- Hint level reached
- Learner confidence before reveal
- Familiar versus novel context
- Input modality and response modality
- Error category
- Pronunciation target and intelligibility result, when applicable
- Time since previous successful retrieval

The scheduler uses this evidence to select the next useful challenge. A learner-facing explanation such as “scheduled because you recognized this word twice but have not produced it in speech” must always be available.

### Progress language

Nawa reports concrete capabilities, for example:

> You can read 114 words, retrieve 82 without help, use 47 in writing, and use 31 while speaking.

Weekly reports show changes in each ability, recurring errors, retained material, and the next week's focus.

## 7. The 60-minute Study Room

The default serious-study session has a stable shape so the learner never has to plan the hour manually. Content within each stage adapts to the learner model.

### 1. Arrival — 3 minutes

- Resume the exact prior state.
- Present two or three specific objectives.
- Run a brief sound, reading, or keyboard calibration.

### 2. Retrieval — 10 minutes

- Select previously learned material whose recall is weakening or incomplete across modalities.
- Mix Arabic-to-meaning, meaning-to-Arabic, audio-to-writing, sentence completion, and spoken production.
- Require an attempt before full reveal.

### 3. New concept — 12 minutes

- Teach one bounded concept.
- Follow the sequence: Notice, Compare, Explain, Try.
- Use short interactions instead of a passive lecture.

### 4. Input laboratory — 12 minutes

- Present a short story, dialogue, note, or adapted import.
- Keep most language known and introduce a controlled amount of new material.
- Provide synchronized audio, sentence looping, progressive diacritics, Language Ink, and difficulty adjustment.

### 5. Output studio — 18 minutes

- Require original Arabic through sentence reconstruction, image description, spoken response, short writing, or a personal-note translation.
- Diagnose one issue at a time.
- Ask for another attempt before showing a corrected version.

### 6. Close — 5 minutes

- Capture a one-minute Arabic journal entry.
- Review the two highest-value corrections.
- Ask the learner to predict what may be forgotten.
- Schedule later retrieval and preserve the exact next starting point.

Shorter 30- and 45-minute sessions preserve retrieval and output. They reduce new material and input volume rather than removing the most educationally demanding stages.

## 8. Study Room interface

### Desktop

- **Left rail:** six stages, current position, and remaining time.
- **Main canvas:** only the current task and its necessary controls.
- **Coach panel:** collapsed by default; contains hints, vocabulary, pronunciation, and explanations.

Speaking and writing tasks expand the main canvas and hide unrelated navigation. The learner can pause at any point and resume on another device.

### Mobile

Mobile presents one task per screen. A persistent “Need a hint” control opens the help ladder. Session stage and remaining time are visible but visually quiet.

### Accessibility

- Full keyboard navigation and visible focus states
- Screen-reader labels in the interface language
- Correct bidirectional text behavior and selection
- Adjustable Arabic type size and line spacing
- Reduced-motion support
- Downloadable audio and offline lesson packs
- Pronunciation tasks that can be deferred when the environment is unsuitable

## 9. Signature learning systems

### Language Ink

Arabic text in notes and the Reader remains ordinary selectable text. Tapping a word opens a contextual micro-lesson containing only information appropriate to the learner's stage:

- Vocalized form and audio
- Meaning in context
- Root and relevant pattern
- Inflection and part of speech
- Related known words
- The word's source and prior encounters
- A short production challenge

The inspection does not automatically add a word to review. The scheduler adds it only when it is instructionally appropriate or when the learner explicitly saves it.

### Progressive diacritics

Nawa uses four assistance levels:

1. Full diacritics
2. Only ambiguity-resolving diacritics
3. Diacritics available on tap
4. Normal unvocalized Arabic

The transition happens per learner and per construction. Known words lose support earlier than unfamiliar patterns. Learners can temporarily restore diacritics without resetting progression.

### Help ladder

Assistance reveals in this order when applicable:

1. Replay audio
2. Show diacritics
3. Highlight word boundaries or the relevant segment
4. Reveal root or pattern
5. Provide an Arabic hint
6. Provide a constrained English hint
7. Reveal the answer and require a corrected attempt

Hint use becomes evidence for future scheduling; it is never treated as an incorrect answer by itself.

### Personal error notebook

The system normalizes mistakes into durable error patterns such as letter confusion, gender agreement, word order, missing prepositions, weak vowel discrimination, and phoneme substitution. Each pattern has:

- Representative learner examples
- A concise explanation
- A contrast set
- Repair exercises across several sessions
- A retirement rule based on successful application in novel contexts

### Morphology laboratory

The laboratory visualizes relevant word families without flooding beginners with full paradigms. A root such as `ك ت ب` can reveal `كَتَبَ`, `كِتاب`, `كاتِب`, `مَكْتَب`, and `مَكْتَبَة` as each form becomes useful. Root and pattern instruction remains subordinate to comprehension and production goals.

### Pronunciation coach

Feedback targets intelligibility and specific articulatory distinctions rather than a universal accent score. It can identify the likely unclear phoneme, demonstrate tongue or mouth placement, compare a minimal pair, replay native audio at multiple speeds, and request one focused retry.

### Transliteration sunset

Transliteration input is available during the earliest script stage. Nawa progressively hides it after the learner demonstrates script competency. It remains temporarily recoverable when blocked but cannot become the default reading representation.

## 10. Universal capture and import

The inbox accepts typed notes, voice memos, photos, scans, PDFs, web text, transcripts, pasted Arabic, and English ideas the learner wants to express.

After processing, Nawa reports the detected language, content type, estimated difficulty, and any uncertainty. The learner may then:

- Explain it at my level
- Add or reduce diacritics
- Create synchronized listening practice
- Extract instructionally appropriate vocabulary
- Adapt it into a future lesson
- Rewrite it using only known language

Imported content never enters the trusted curriculum automatically. It remains personal content until validation passes and the learner chooses to use it for practice.

## 11. Tutor behavior

The tutor is a bounded instructional coach. It does not lead with open chat. During an error it follows this policy:

1. Identify a single actionable issue.
2. Ask the learner to notice or locate it.
3. Provide the smallest useful hint.
4. Request another attempt.
5. Explain after effort if the learner remains blocked.
6. Schedule an analogous future challenge.

The tutor distinguishes verified curriculum facts from generated examples. It cannot change mastery state directly; only evidence from learner attempts can do that.

## 12. Conceptual architecture

The product is divided into independently testable domains:

### Curriculum graph

Owns knowledge atoms, prerequisites, instructional content, accepted answers, common errors, and milestone definitions. It does not store learner state.

### Learner model

Owns evidence events, ability-specific mastery states, error patterns, and learner preferences. It exposes explanations for all derived states.

### Session planner

Builds a session from curriculum requirements, due retrieval, personal goals, fatigue signals, and available time. It cannot generate unvalidated curriculum facts.

### Notebook and content library

Owns original user content, revisions, imports, source metadata, Language Ink annotations, and exports. The original source is preserved separately from adapted learning versions.

### Practice engine

Creates exercises from trusted templates, curriculum atoms, and approved personal content. It records attempts but delegates mastery calculation to the learner model.

### Speech and handwriting services

Produce modality-specific evidence with confidence levels. Low-confidence analysis is withheld or framed as a retry request rather than asserted as fact.

### Tutor service

Applies the hint policy and generates explanations within curriculum constraints. It cannot silently publish generated content into the curriculum graph.

### Validation pipeline

Checks generated Arabic for script integrity, diacritics, morphology, grammar, MSA register, answer equivalence, and prohibited dialect mixing. High-impact curriculum content requires human editorial approval before release.

## 13. Core data flow

1. The learner starts or resumes a Study Room session.
2. The session planner requests due retrieval, current prerequisites, and recent error patterns.
3. The practice engine assembles validated tasks and level-appropriate personal contexts.
4. The learner attempts a task before receiving full help.
5. The task emits an immutable evidence event.
6. The learner model updates ability-specific state and error patterns.
7. The planner adapts later tasks within the session without changing the session's overall educational shape.
8. The close stage schedules future retrieval and writes a clear session summary.

Original notes are never overwritten by an adapted text or AI correction. Adaptations are linked derivatives with visible provenance.

## 14. Failure handling and trust

- If speech confidence is low, Nawa asks for a cleaner recording or allows the learner to defer; it does not penalize mastery.
- If handwriting recognition is uncertain, the learner can confirm the intended letters before feedback is stored.
- If diacritization has multiple valid readings, Nawa shows the contextual choice and marks alternatives.
- If import parsing fails, the original asset remains available and the learner receives a specific retry path.
- If offline, completed attempts are queued locally with stable identifiers and synchronized idempotently later.
- Conflicting evidence does not erase history; the learner model lowers confidence and schedules a discriminating assessment.
- Generated explanations always identify whether they come from trusted curriculum content or an AI-generated contextual explanation.

## 15. Initial curriculum boundary

The first release covers absolute beginner through a strong A1 foundation in MSA:

- Script recognition, connected forms, keyboard entry, and handwriting fundamentals
- Core pronunciation contrasts
- Full-to-reduced diacritic progression
- Approximately 500 high-utility words and phrases
- Basic nominal and verbal sentence patterns
- Gender, number, definite article, personal pronouns, common prepositions, and basic agreement
- Present and past forms of a controlled set of common verbs
- Short graded reading and listening passages
- Guided personal notes, journal entries, and brief spoken responses

Dialect overlays, advanced case endings, extended verb-form study, and literary or religious specialization follow later products and are not mixed into this sequence.

## 16. Release scope

### Required for version 1

- Beginner onboarding and script/pronunciation diagnostic
- Curriculum graph and evidence-based learner model
- 30-, 45-, and 60-minute Study Room sessions
- Today, Notebook, Reader, Practice, and Memory destinations
- Language Ink with contextual word inspection
- Progressive diacritics and the help ladder
- Multi-directional retrieval scheduling
- Text, audio, image, and PDF capture
- Personal error notebook
- Foundational speaking and handwriting feedback
- Transparent progress reports and data export
- Offline session continuation and reliable synchronization

### Deferred until after version 1

- Dialect tracks
- Teacher dashboards
- Community and social features
- Live tutoring marketplace
- Collaborative notebooks
- Advanced literary and domain-specialist curricula

## 17. Evaluation plan

### Functional testing

- Bidirectional Arabic/English editing, selection, and annotation
- Deterministic session reconstruction and resume
- Idempotent evidence synchronization
- Original-versus-adapted content preservation
- Correct mastery transitions and prerequisite enforcement
- Help-ladder ordering and answer-reveal rules

### Content and linguistic testing

- Native MSA editorial review of all released curriculum content
- Automated and human checks for diacritics, connected forms, grammar, and dialect contamination
- Accepted-answer testing for legitimate orthographic and syntactic variation
- Adversarial examples for ambiguous roots and homographs

### Learning evaluation

- Delayed retrieval at 7, 30, and 90 days
- Transfer to unfamiliar sentences and voices
- Separate reading, listening, writing, and speaking measures
- Comparison of passive review against Nawa's retrieval-and-output sequence
- Analysis of hint dependence and transliteration dependence over time

### Usability and accessibility testing

- Serious adult beginners completing full sessions without facilitation
- Mobile interruption and cross-device resume
- Keyboard-only and screen-reader flows
- Arabic type-size and line-spacing stress tests
- Low-bandwidth and offline scenarios

## 18. Success criteria

The first product is successful when:

- Learners complete serious sessions without needing to plan their own sequence.
- Progress reports correspond to demonstrated abilities rather than time spent.
- Retention and transfer improve across delayed assessments.
- Reliance on transliteration and full diacritics declines without a collapse in comprehension.
- Personal content increases meaningful production while curriculum coverage remains intact.
- The system gives actionable feedback without confidently presenting uncertain Arabic analysis.
- Learners can export their notes and study history in understandable formats.

## 19. Research basis

The design uses retrieval, delayed recall, productive output, and staged reading support as core mechanisms. Relevant starting references include:

- Karpicke and Roediger, “The Critical Importance of Retrieval for Learning,” *Science* (2008): <https://doi.org/10.1126/science.1152408>
- Wagner, Spratt, and Ezzaki, “Arabic Orthography and Reading Acquisition” (1993): <https://doi.org/10.1016/S0166-4115(08)61665-9>
- Koval, “Testing the reminding account of the lag effect in L2 vocabulary learning,” *Applied Psycholinguistics* (2021): <https://doi.org/10.1017/S0142716421000370>

These sources motivate product hypotheses; Nawa's own delayed-recall and transfer studies remain necessary to validate the complete system.
