import fs from "node:fs";
import path from "node:path";
import { stringify } from "yaml";

/**
 * One-time chapter skeleton generator for a public-domain book (ADR 0024).
 * Reads a Project Gutenberg plain-text file, strips the license boilerplate,
 * unwraps hard line breaks, splits chapters on their headings, packs
 * paragraphs into sections of roughly 400-800 words, and writes one chapter
 * YAML skeleton per chapter (empty quiz, no check-ins) under
 * content/books/<slug>/chapters/.
 *
 * The output is a STARTING POINT: adjust awkward section breaks by hand,
 * then run `bun run content:book-questions` to draft the questions, review
 * them, and register the files in book.yaml's chapterFiles. Existing chapter
 * files are never overwritten (they may already carry reviewed questions);
 * pass --force to regenerate one explicitly.
 *
 * Usage:
 *   bun scripts/ingest-book.ts --file <gutenberg.txt> --slug <dir> --prefix <id-prefix> [--from N] [--to N] [--force]
 * Example (The Wonderful Wizard of Oz, Gutenberg #55):
 *   bun scripts/ingest-book.ts --file /tmp/pg55.txt --slug the-wonderful-wizard-of-oz --prefix oz --book-id book-oz
 */

interface Args {
  file: string;
  slug: string;
  prefix: string;
  bookId: string;
  from: number;
  to: number;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const file = get("file");
  const slug = get("slug");
  const prefix = get("prefix");
  if (!file || !slug || !prefix) {
    console.error(
      "Usage: bun scripts/ingest-book.ts --file <gutenberg.txt> --slug <dir> --prefix <id-prefix> [--book-id <id>] [--from N] [--to N] [--force]",
    );
    process.exit(1);
  }
  return {
    file,
    slug,
    prefix,
    bookId: get("book-id") ?? `book-${prefix}`,
    from: Number(get("from") ?? 1),
    to: Number(get("to") ?? Infinity),
    force: argv.includes("--force"),
  };
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function chapterNumber(heading: string): number {
  if (/^\d+$/.test(heading)) return Number(heading);
  let n = 0;
  for (let i = 0; i < heading.length; i++) {
    const value = ROMAN[heading[i]];
    const next = ROMAN[heading[i + 1]] ?? 0;
    n += value < next ? -value : value;
  }
  return n;
}

interface RawChapter {
  number: number;
  title: string;
  paragraphs: string[];
}

/** Strip Gutenberg boilerplate and split into chapters of unwrapped paragraphs. */
function parseChapters(raw: string): RawChapter[] {
  const start = raw.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK");
  const end = raw.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
  const body = (start >= 0 && end > start ? raw.slice(raw.indexOf("\n", start) + 1, end) : raw)
    // Illustration markers are print artifacts, not prose.
    .replace(/\[Illustration[^\]]*\]/g, "");

  const chapters: RawChapter[] = [];
  let current: RawChapter | null = null;
  let pendingTitle = false;
  let paragraph: string[] = [];

  const flush = () => {
    if (!current || paragraph.length === 0) return;
    current.paragraphs.push(paragraph.join(" ").replace(/\s+/g, " ").trim());
    paragraph = [];
  };

  for (const line of body.split(/\r?\n/)) {
    const heading = /^Chapter ([IVXLCDM]+|\d+)\.?$/.exec(line.trim());
    if (heading) {
      flush();
      current = { number: chapterNumber(heading[1]), title: "", paragraphs: [] };
      chapters.push(current);
      pendingTitle = true;
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    if (pendingTitle) {
      if (trimmed) {
        current.title = trimmed;
        pendingTitle = false;
      }
      continue;
    }
    if (!trimmed) flush();
    else paragraph.push(trimmed);
  }
  flush();
  return chapters;
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Greedy paragraph packing targeting 400-800 words per section: close a
 * section at 400 words, never exceed 800 unless a single paragraph does. A
 * runt final section (<150 words) merges into its predecessor.
 */
function splitSections(paragraphs: string[]): string[][] {
  const sections: string[][] = [];
  let acc: string[] = [];
  let accWords = 0;
  for (const p of paragraphs) {
    const words = wordCount(p);
    if (accWords > 0 && (accWords >= 400 || accWords + words > 800)) {
      sections.push(acc);
      acc = [];
      accWords = 0;
    }
    acc.push(p);
    accWords += words;
  }
  if (acc.length) sections.push(acc);
  if (sections.length >= 2 && wordCount(sections[sections.length - 1].join(" ")) < 150) {
    const last = sections.pop()!;
    sections[sections.length - 1].push(...last);
  }
  return sections;
}

const args = parseArgs(process.argv.slice(2));
const chapters = parseChapters(fs.readFileSync(args.file, "utf8"));
if (chapters.length === 0) {
  console.error("No chapters found — is this a Gutenberg text with 'Chapter N' headings?");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "content", "books", args.slug, "chapters");
fs.mkdirSync(outDir, { recursive: true });

const written: string[] = [];
for (const chapter of chapters) {
  const sections = splitSections(chapter.paragraphs);
  const total = wordCount(chapter.paragraphs.join(" "));
  const id = `${args.prefix}-ch-${String(chapter.number).padStart(2, "0")}`;
  console.log(
    `${id}  ${chapter.title.padEnd(40)} ${String(total).padStart(5)}w  ${sections.length} sections`,
  );
  if (chapter.number < args.from || chapter.number > args.to) continue;

  const file = path.join(outDir, `${id}.yaml`);
  if (fs.existsSync(file) && !args.force) {
    console.log(`  → exists, skipped (--force to overwrite)`);
    continue;
  }
  const doc = {
    id,
    bookId: args.bookId,
    title: chapter.title,
    titleZh: "TODO",
    sections: sections.map((paragraphs, i) => ({
      id: `${id}-s${i + 1}`,
      text: paragraphs.join("\n\n"),
    })),
    quiz: [],
  };
  fs.writeFileSync(
    file,
    "# yaml-language-server: $schema=../../../.schemas/book-chapter.schema.json\n" +
      stringify(doc, { lineWidth: 0 }),
  );
  written.push(`${id}.yaml`);
}

console.log(`\nWrote ${written.length} skeleton(s) to ${outDir}`);
if (written.length) {
  console.log("Add them to book.yaml chapterFiles (order is load-bearing):");
  for (const file of written) console.log(`  - ${file}`);
}
