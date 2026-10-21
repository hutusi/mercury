import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  bookChapters,
  books,
  listeningExercises,
  mockExams,
  readingExercises,
  speakingPrompts,
  writingPrompts,
} from "../db/schema";
import type { PlanStop } from "../plan-status-core";

/**
 * The specific content behind each stop ("Minutes: Product Steering
 * Committee", "The Wonderful Wizard of Oz · Ch. 4"), keyed by stop key, for
 * the Today route's second line. One parallel wave of title-only reads.
 */
export async function getStopTitles(stops: readonly PlanStop[]): Promise<Map<string, string>> {
  const ids = (kind: PlanStop["kind"]) =>
    stops.filter((s) => s.kind === kind && s.refId).map((s) => s.refId as string);
  const reading = ids("reading");
  const listening = ids("listening");
  const writing = ids("writing");
  const speaking = ids("speaking");
  const chapters = ids("book_chapter");
  const exams = ids("mock_exam");
  const none = Promise.resolve([] as { id: string; title: string }[]);

  const [r, l, w, s, c, e] = await Promise.all([
    reading.length
      ? db
          .select({ id: readingExercises.id, title: readingExercises.title })
          .from(readingExercises)
          .where(inArray(readingExercises.id, reading))
      : none,
    listening.length
      ? db
          .select({ id: listeningExercises.id, title: listeningExercises.title })
          .from(listeningExercises)
          .where(inArray(listeningExercises.id, listening))
      : none,
    writing.length
      ? db
          .select({ id: writingPrompts.id, title: writingPrompts.title })
          .from(writingPrompts)
          .where(inArray(writingPrompts.id, writing))
      : none,
    speaking.length
      ? db
          .select({ id: speakingPrompts.id, title: speakingPrompts.title })
          .from(speakingPrompts)
          .where(inArray(speakingPrompts.id, speaking))
      : none,
    chapters.length
      ? db
          .select({ id: bookChapters.id, book: books.title, sortOrder: bookChapters.sortOrder })
          .from(bookChapters)
          .innerJoin(books, eq(books.id, bookChapters.bookId))
          .where(inArray(bookChapters.id, chapters))
          .then((rows) =>
            rows.map((row) => ({ id: row.id, title: `${row.book} · Ch. ${row.sortOrder}` })),
          )
      : none,
    exams.length
      ? db
          .select({ id: mockExams.id, title: mockExams.titleZh })
          .from(mockExams)
          .where(inArray(mockExams.id, exams))
      : none,
  ]);

  const byKindId = new Map<string, string>();
  const put = (kind: string, rows: { id: string; title: string }[]) => {
    for (const row of rows) byKindId.set(`${kind}:${row.id}`, row.title);
  };
  put("reading", r);
  put("listening", l);
  put("writing", w);
  put("speaking", s);
  put("book_chapter", c);
  put("mock_exam", e);

  const titles = new Map<string, string>();
  for (const stop of stops) {
    const title = byKindId.get(stop.key);
    if (title) titles.set(stop.key, title);
  }
  return titles;
}
