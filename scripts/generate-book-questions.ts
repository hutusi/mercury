import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { getStructuredDraft, isAiEnabled } from "../src/lib/ai/client";
import {
  BookChapterSchema,
  BookManifestSchema,
  McqQuestionSchema,
  type CefrLevel,
} from "../src/content/types";

/**
 * AI-assisted question drafting for book chapters (ADR 0024). For every
 * chapter YAML whose quiz is still empty (fresh ingest-book.ts skeletons),
 * asks the configured AI provider for one check-in per section plus a 4-6
 * question end-of-chapter recall quiz, assembles stable ids, validates
 * against the real content schema, and REWRITES THE YAML FOR HUMAN REVIEW.
 *
 * Nothing here runs at runtime — review every generated question before
 * committing (docs/CONTENT.md has the checklist). Chapters that already
 * carry questions are skipped; use --force to redraft one deliberately
 * (existing question ids are answer-map keys, so never regenerate a chapter
 * that has shipped).
 *
 * Usage: bun scripts/generate-book-questions.ts [--book <slug>] [--chapter <id>] [--force]
 * Needs ANTHROPIC_API_KEY or DASHSCOPE_API_KEY (same resolution as the app).
 */

const BOOKS_DIR = path.join(process.cwd(), "content", "books");
const SCHEMA_HEADER =
  "# yaml-language-server: $schema=../../../.schemas/book-chapter.schema.json\n";

// Skeletons have an empty quiz — relax only that constraint for reading.
const SkeletonSchema = BookChapterSchema.extend({ quiz: z.array(McqQuestionSchema) });

// The model names the correct answer and three distractors but NEVER picks
// positions: placement is assigned deterministically below. This removes two
// whole failure classes seen in review — position clustering (the model
// ignores "distribute" instructions) and a correctIndex that contradicts the
// explanation.
const DraftQuestionSchema = z.object({
  stem: z.string(),
  correct: z.string(),
  distractors: z.array(z.string()).length(3),
  explanationZh: z.string(),
});

const DraftSchema = z.object({
  titleZh: z.string(),
  summaryZh: z.string(),
  checkIns: z.array(DraftQuestionSchema.extend({ sectionId: z.string() })),
  quiz: z.array(DraftQuestionSchema).min(3).max(6),
});

// The difficulty target comes from the book's manifest so a B2 novel is not
// dumbed down to B1 questions (and vice versa).
const systemPrompt = (
  cefrLevel: CefrLevel,
) => `You are a bilingual (English / Simplified Chinese) content author for Mercury, an English-learning app for Chinese learners around CEFR ${cefrLevel}. You write retrieval-practice questions for chapters of public-domain English books.

Given one chapter, produce:
1. titleZh — a natural Simplified Chinese translation of the chapter title (follow the published Chinese translation conventions for well-known books).
2. summaryZh — a one-to-two sentence 中文章节导读 that sets up the chapter without answering any of your questions.
3. checkIns — EXACTLY one per <section>, keyed by that section's id, asking about something clearly stated in THAT section (never a later one). Low stakes: a reader who just read the section should get it right.
4. quiz — 4 to 6 end-of-chapter recall questions spanning the whole chapter (3 is acceptable for a very short chapter): plot causality (why things happened), character motivation, and memorable concrete details. Learners answer with the book closed.

Rules for every question:
- stem, the correct answer, and all three distractors in English at or below ${cefrLevel} difficulty; distractors plausible and mutually exclusive with the correct answer.
- Option order is assigned by tooling, never by you: give the correct answer in \`correct\` and the three wrong answers in \`distractors\`.
- explanationZh in Simplified Chinese: teach rather than assert — point to what happens in the text (short English quotes are welcome) and briefly dismiss the most tempting distractor BY ITS CONTENT. Never refer to options by letter or position (no 选项A/选项1/option B) — positions are not known when you write.
- Never ask about wording trivia, chapter numbers, or anything outside this chapter.`;

function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h || 1;
}

/** Deterministic PRNG (mulberry32) — placement must be reproducible. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n correct-answer positions spread as evenly as possible over 0-3. */
function balancedTargets(n: number, rand: () => number): number[] {
  const extras = shuffled([0, 1, 2, 3], rand).slice(0, n % 4);
  const list: number[] = [];
  for (let position = 0; position < 4; position++) {
    const count = Math.floor(n / 4) + (extras.includes(position) ? 1 : 0);
    for (let i = 0; i < count; i++) list.push(position);
  }
  return shuffled(list, rand);
}

interface Args {
  book: string | null;
  chapter: string | null;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | null => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? (argv[index + 1] ?? null) : null;
  };
  return { book: get("book"), chapter: get("chapter"), force: argv.includes("--force") };
}

function chapterFiles(book: string | null): { slug: string; file: string }[] {
  const slugs = book
    ? [book]
    : fs
        .readdirSync(BOOKS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
  return slugs.flatMap((slug) => {
    const dir = path.join(BOOKS_DIR, slug, "chapters");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".yaml"))
      .sort()
      .map((name) => ({ slug, file: path.join(dir, name) }));
  });
}

async function draftChapter(
  slug: string,
  file: string,
  force: boolean,
): Promise<"drafted" | "skipped"> {
  const chapter = SkeletonSchema.parse(parse(fs.readFileSync(file, "utf8")));
  if (chapter.quiz.length > 0 && !force) return "skipped";

  const manifest = BookManifestSchema.pick({ title: true, author: true, cefrLevel: true }).parse(
    parse(fs.readFileSync(path.join(BOOKS_DIR, slug, "book.yaml"), "utf8")),
  );

  const sectionsXml = chapter.sections
    .map((section) => `<section id="${section.id}">\n${section.text}\n</section>`)
    .join("\n\n");
  const userContent = `<book title="${manifest.title}" author="${manifest.author}">
<chapter id="${chapter.id}" title="${chapter.title}">
${sectionsXml}
</chapter>
</book>

Draft the check-ins and end-of-chapter quiz for this chapter.`;

  const draft = await getStructuredDraft({
    system: systemPrompt(manifest.cefrLevel),
    userContent,
    schema: DraftSchema,
  });

  const checkInBySection = new Map(draft.checkIns.map((c) => [c.sectionId, c]));
  for (const sectionId of checkInBySection.keys()) {
    if (!chapter.sections.some((s) => s.id === sectionId)) {
      console.warn(`  ! dropped check-in for unknown section ${sectionId}`);
    }
  }

  // Placement is script-owned and reproducible: each pool (check-ins, quiz)
  // gets a balanced multiset of positions — spread as evenly as possible
  // over 0-3, so a chapter quiz always satisfies the content-test cap of
  // ceil(n/4) per position — shuffled by a PRNG seeded from the chapter id
  // so the sequence is balanced but not a predictable A→B→C→D walk.
  const placedCheckIns = chapter.sections.filter((s) => checkInBySection.has(s.id)).length;
  const checkInTargets = balancedTargets(placedCheckIns, mulberry32(hashStr(`${chapter.id}:ci`)));
  const quizTargets = balancedTargets(draft.quiz.length, mulberry32(hashStr(`${chapter.id}:quiz`)));
  const place = (question: z.infer<typeof DraftQuestionSchema>, id: string, targets: number[]) => {
    const correctIndex = targets.shift();
    if (correctIndex === undefined) throw new Error(`ran out of position targets at ${id}`);
    return {
      id,
      stem: question.stem,
      options: [
        ...question.distractors.slice(0, correctIndex),
        question.correct,
        ...question.distractors.slice(correctIndex),
      ],
      correctIndex,
      explanationZh: question.explanationZh,
    };
  };

  const assembled = {
    id: chapter.id,
    bookId: chapter.bookId,
    title: chapter.title,
    titleZh: chapter.titleZh === "TODO" ? draft.titleZh : chapter.titleZh,
    summaryZh: chapter.summaryZh ?? draft.summaryZh,
    sections: chapter.sections.map((section) => {
      const checkIn = checkInBySection.get(section.id);
      return {
        id: section.id,
        text: section.text,
        ...(checkIn ? { checkIn: place(checkIn, `${section.id}-c1`, checkInTargets) } : {}),
      };
    }),
    quiz: draft.quiz.map((question, i) => place(question, `${chapter.id}-q${i + 1}`, quizTargets)),
  };

  const missing = assembled.sections.filter((s) => !s.checkIn).map((s) => s.id);
  if (missing.length) console.warn(`  ! sections without a check-in: ${missing.join(", ")}`);
  const allQuestions = [
    ...assembled.sections.flatMap((s) => (s.checkIn ? [s.checkIn] : [])),
    ...assembled.quiz,
  ];
  // The JSON-repair path can silently truncate strings; catch gutted output.
  const gutted = allQuestions.filter((q) => q.explanationZh.trim().length < 10).map((q) => q.id);
  if (gutted.length) {
    console.warn(`  ! empty/truncated explanationZh: ${gutted.join(", ")} — redraft with --force`);
  }
  // Positional references break whenever tooling (re)assigns placement —
  // the content test rejects them, so flag drafts early. The letter branch
  // needs the lookahead: "选项 Because…" names content, not position B.
  // Keep in sync with the matcher in src/content/content.test.ts.
  const positionalRe =
    /(?:选项|答案)\s*(?:是|为)?\s*[0-9０-９①-⑩]|(?:选项|答案)\s*(?:是|为)?\s*[A-D](?![A-Za-z])|第\s*(?:[0-9０-９]+|[一二三四五六七八九十])\s*(?:个)?\s*(?:选项|答案)|option\s*[0-9]|option\s+[a-d](?![a-z])|(?:first|second|third|fourth)\s+option/i;
  const positional = allQuestions
    .filter((q) => positionalRe.test(q.explanationZh))
    .map((q) => q.id);
  if (positional.length) {
    console.warn(
      `  ! explanationZh references options by position: ${positional.join(", ")} — reword before committing`,
    );
  }

  fs.writeFileSync(
    file,
    SCHEMA_HEADER + stringify(BookChapterSchema.parse(assembled), { lineWidth: 0 }),
  );
  return "drafted";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!isAiEnabled()) {
    console.error("No AI provider configured — set ANTHROPIC_API_KEY or DASHSCOPE_API_KEY.");
    process.exit(1);
  }

  let drafted = 0;
  let skipped = 0;
  for (const { slug, file } of chapterFiles(args.book)) {
    const id = path.basename(file, ".yaml");
    if (args.chapter && id !== args.chapter) continue;
    process.stdout.write(`${slug}/${id} … `);
    const outcome = await draftChapter(slug, file, args.force);
    console.log(outcome);
    if (outcome === "drafted") drafted += 1;
    else skipped += 1;
  }
  console.log(`\n${drafted} drafted, ${skipped} skipped (already have questions).`);
  if (drafted > 0) {
    console.log("Review every generated question before committing — see docs/CONTENT.md.");
  }
}

main().catch((error) => {
  console.error("Generation failed:", error);
  process.exit(1);
});
