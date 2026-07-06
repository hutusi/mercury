import { z } from "zod";
import {
  allExams,
  allListening,
  allReading,
  allSpeaking,
  allVocab,
  allWriting,
} from "../../content/load";
import {
  examQuestionCount,
  ListeningExerciseSchema,
  MockExamSchema,
  ReadingExerciseSchema,
  SpeakingPromptSchema,
  VocabWordSchema,
  WritingPromptSchema,
} from "../../content/types";
import { db } from "./index";
import {
  listeningExercises,
  mockExams,
  readingExercises,
  speakingPrompts,
  vocabWords,
  writingPrompts,
} from "./schema";

function validate<T>(label: string, schema: z.ZodType<T>, items: unknown[]): T[] {
  const parsed = z.array(schema).parse(items);
  const ids = new Set(parsed.map((item) => (item as { id: string }).id));
  if (ids.size !== parsed.length) {
    throw new Error(`${label}: duplicate ids detected`);
  }
  return parsed;
}

async function seed() {
  const vocab = validate("vocab", VocabWordSchema, allVocab);
  const reading = validate("reading", ReadingExerciseSchema, allReading);
  const listening = validate("listening", ListeningExerciseSchema, allListening);
  const writing = validate("writing", WritingPromptSchema, allWriting);
  const speaking = validate("speaking", SpeakingPromptSchema, allSpeaking);
  const exams = validate("exams", MockExamSchema, allExams);

  // Exam question ids are answer-map keys — they must be unique per exam.
  for (const exam of exams) {
    const qids = exam.sections.flatMap((s) =>
      s.groups.flatMap((g) => g.questions.map((q) => q.id)),
    );
    if (new Set(qids).size !== qids.length) {
      throw new Error(`exam ${exam.id}: duplicate question ids`);
    }
  }

  for (const [i, word] of vocab.entries()) {
    await db
      .insert(vocabWords)
      .values({ ...word, sortOrder: i })
      .onConflictDoUpdate({ target: vocabWords.id, set: { ...word, sortOrder: i } });
  }

  for (const ex of reading) {
    await db
      .insert(readingExercises)
      .values(ex)
      .onConflictDoUpdate({ target: readingExercises.id, set: ex });
  }

  for (const ex of listening) {
    await db
      .insert(listeningExercises)
      .values(ex)
      .onConflictDoUpdate({ target: listeningExercises.id, set: ex });
  }

  for (const prompt of writing) {
    await db
      .insert(writingPrompts)
      .values(prompt)
      .onConflictDoUpdate({ target: writingPrompts.id, set: prompt });
  }

  for (const prompt of speaking) {
    await db
      .insert(speakingPrompts)
      .values(prompt)
      .onConflictDoUpdate({ target: speakingPrompts.id, set: prompt });
  }

  for (const exam of exams) {
    const row = { ...exam, totalQuestions: examQuestionCount(exam) };
    await db.insert(mockExams).values(row).onConflictDoUpdate({ target: mockExams.id, set: row });
  }

  console.log("Seed complete:");
  console.log(`  vocab_words:         ${vocab.length}`);
  console.log(`  reading_exercises:   ${reading.length}`);
  console.log(`  listening_exercises: ${listening.length}`);
  console.log(`  writing_prompts:     ${writing.length}`);
  console.log(`  speaking_prompts:    ${speaking.length}`);
  console.log(
    `  mock_exams:          ${exams.length} (${exams
      .map((e) => `${e.id}: ${examQuestionCount(e)}Q`)
      .join(", ")})`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
