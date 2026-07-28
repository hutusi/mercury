import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { getStructuredDraft, isAiEnabled } from "../src/lib/ai/client";
import { BookChapterSchema, McqQuestionSchema } from "../src/content/types";

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

const DraftQuestionSchema = z.object({
  stem: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanationZh: z.string(),
});

const DraftSchema = z.object({
  titleZh: z.string(),
  summaryZh: z.string(),
  checkIns: z.array(DraftQuestionSchema.extend({ sectionId: z.string() })),
  quiz: z.array(DraftQuestionSchema).min(3).max(6),
});

const SYSTEM_PROMPT = `You are a bilingual (English / Simplified Chinese) content author for Mercury, an English-learning app for Chinese learners around CEFR B1. You write retrieval-practice questions for chapters of public-domain English books.

Given one chapter, produce:
1. titleZh — a natural Simplified Chinese translation of the chapter title (follow the published Chinese translation conventions for well-known books).
2. summaryZh — a one-to-two sentence 中文章节导读 that sets up the chapter without answering any of your questions.
3. checkIns — EXACTLY one per <section>, keyed by that section's id, asking about something clearly stated in THAT section (never a later one). Low stakes: a reader who just read the section should get it right.
4. quiz — 4 to 6 end-of-chapter recall questions spanning the whole chapter (3 is acceptable for a very short chapter): plot causality (why things happened), character motivation, and memorable concrete details. Learners answer with the book closed.

Rules for every question:
- stem and all four options in English at or below B1 difficulty; options plausible, mutually exclusive, exactly one correct.
- Vary correctIndex across the whole set — spread correct answers over positions 0-3, never cluster them.
- explanationZh in Simplified Chinese: teach rather than assert — point to what happens in the text (short English quotes are welcome) and briefly dismiss the most tempting distractor.
- Never ask about wording trivia, chapter numbers, or anything outside this chapter.`;

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

  const manifest = parse(
    fs.readFileSync(path.join(BOOKS_DIR, slug, "book.yaml"), "utf8"),
  ) as Record<string, string>;

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
    system: SYSTEM_PROMPT,
    userContent,
    schema: DraftSchema,
  });

  const checkInBySection = new Map(draft.checkIns.map((c) => [c.sectionId, c]));
  for (const sectionId of checkInBySection.keys()) {
    if (!chapter.sections.some((s) => s.id === sectionId)) {
      console.warn(`  ! dropped check-in for unknown section ${sectionId}`);
    }
  }

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
        ...(checkIn
          ? {
              checkIn: {
                id: `${section.id}-c1`,
                stem: checkIn.stem,
                options: checkIn.options,
                correctIndex: checkIn.correctIndex,
                explanationZh: checkIn.explanationZh,
              },
            }
          : {}),
      };
    }),
    quiz: draft.quiz.map((question, i) => ({
      id: `${chapter.id}-q${i + 1}`,
      stem: question.stem,
      options: question.options,
      correctIndex: question.correctIndex,
      explanationZh: question.explanationZh,
    })),
  };

  const missing = assembled.sections.filter((s) => !s.checkIn).map((s) => s.id);
  if (missing.length) console.warn(`  ! sections without a check-in: ${missing.join(", ")}`);
  const spread = new Set(assembled.quiz.map((q) => q.correctIndex));
  if (spread.size < 3) {
    console.warn(`  ! quiz correctIndex clusters on ${[...spread].join(",")} — review closely`);
  }
  // The JSON-repair path can silently truncate strings; catch gutted output.
  const allQuestions = [
    ...assembled.sections.flatMap((s) => (s.checkIn ? [s.checkIn] : [])),
    ...assembled.quiz,
  ];
  const gutted = allQuestions.filter((q) => q.explanationZh.trim().length < 10).map((q) => q.id);
  if (gutted.length) {
    console.warn(`  ! empty/truncated explanationZh: ${gutted.join(", ")} — redraft with --force`);
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
