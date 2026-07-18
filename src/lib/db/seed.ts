import { z } from "zod";
import {
  examManifestKey,
  listeningManifestKey,
  resolveAudioUrl,
  resolveExamAudioUrl,
  resolveVocabAudioUrl,
  vocabManifestKey,
} from "../../content/audio-hash";
import {
  allExams,
  allListening,
  allReading,
  allSpeaking,
  allVocab,
  allWriting,
  audioManifest,
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

  // Content versions move as one unit. A validation or database failure can
  // never leave practice areas on different seed revisions.
  await db.transaction(async (tx) => {
    for (const [i, word] of vocab.entries()) {
      await tx
        .insert(vocabWords)
        .values({ ...word, sortOrder: i })
        .onConflictDoUpdate({ target: vocabWords.id, set: { ...word, sortOrder: i } });
    }

    for (const ex of reading) {
      await tx
        .insert(readingExercises)
        .values(ex)
        .onConflictDoUpdate({ target: readingExercises.id, set: ex });
    }

    for (const ex of listening) {
      // Link pre-generated audio only when its manifest hash matches this
      // exact script — stale audio degrades to browser TTS, never mismatched
      // playback. audioUrl rides the update set so revocations propagate.
      const audioUrl = resolveAudioUrl(ex.id, ex.script, audioManifest);
      if (!audioUrl && audioManifest[listeningManifestKey(ex.id)]) {
        console.warn(
          `  listening ${ex.id}: audio is stale (script changed) — run bun run content:audio`,
        );
      }
      const row = { ...ex, audioUrl };
      await tx
        .insert(listeningExercises)
        .values(row)
        .onConflictDoUpdate({ target: listeningExercises.id, set: row });
    }

    for (const prompt of writing) {
      await tx
        .insert(writingPrompts)
        .values(prompt)
        .onConflictDoUpdate({ target: writingPrompts.id, set: prompt });
    }

    for (const prompt of speaking) {
      await tx
        .insert(speakingPrompts)
        .values(prompt)
        .onConflictDoUpdate({ target: speakingPrompts.id, set: prompt });
    }

    for (const exam of exams) {
      // Listening groups carry their render's path under the same
      // hash-freshness rule as exercises; attempt snapshots copy it along.
      const sections = exam.sections.map((section) => ({
        ...section,
        groups: section.groups.map((group) => {
          if (!group.script) return group;
          const audioUrl = resolveExamAudioUrl(exam.id, group.id, group.script, audioManifest);
          if (!audioUrl && audioManifest[examManifestKey(exam.id, group.id)]) {
            console.warn(
              `  exam ${exam.id}/${group.id}: audio is stale (script changed) — run bun run content:audio`,
            );
          }
          return { ...group, audioUrl };
        }),
      }));
      const row = { ...exam, sections, totalQuestions: examQuestionCount(exam) };
      await tx.insert(mockExams).values(row).onConflictDoUpdate({ target: mockExams.id, set: row });
    }
  });

  const withAudio = listening.filter((ex) =>
    resolveAudioUrl(ex.id, ex.script, audioManifest),
  ).length;

  console.log("Seed complete:");
  console.log(`  vocab_words:         ${vocab.length}`);
  console.log(`  reading_exercises:   ${reading.length}`);
  console.log(
    `  listening_exercises: ${listening.length} (${withAudio} with audio, ${listening.length - withAudio} browser TTS)`,
  );
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
