import fs from "node:fs";
import path from "node:path";
import { stringify } from "yaml";

/**
 * One-time chapter skeleton generator for a public-domain book (ADR 0024).
 * Two source modes converge on the same output: chapters packed into sections
 * of roughly 400-800 words, one YAML skeleton per chapter (empty quiz, no
 * check-ins) under content/books/<slug>/chapters/.
 *
 *   --file <gutenberg.txt>
 *       Project Gutenberg plain text: strips the license boilerplate, unwraps
 *       hard line breaks, splits chapters on their headings — "Chapter N" by
 *       default; --heading-regex '<re>' overrides it (capture group 1 is the
 *       chapter number, roman or arabic; an optional group 2 is a same-line
 *       title, otherwise the next non-blank line becomes the title).
 *
 *   --se-dir <repo> --files <a.xhtml,b.xhtml,...>
 *       Standard Ebooks source repo: parses the listed src/epub/text/ XHTML
 *       chapter files. The --files list is explicit and ordered because it
 *       doubles as chapter selection (collected volumes ship stories we skip)
 *       and reading order (fs order lies: chapter-10 sorts before chapter-2).
 *       List position becomes the chapter number.
 *
 * The output is a STARTING POINT: adjust awkward section breaks by hand,
 * then run `bun run content:book-questions` to draft the questions, review
 * them, and register the files in book.yaml's chapterFiles. Existing chapter
 * files are never overwritten (they may already carry reviewed questions);
 * pass --force to regenerate one explicitly.
 *
 * Usage:
 *   bun scripts/ingest-book.ts (--file <gutenberg.txt> [--heading-regex '<re>'] | --se-dir <repo> --files <list>) \
 *     --slug <dir> --prefix <id-prefix> [--book-id <id>] [--from N] [--to N] [--force]
 * Examples:
 *   bun scripts/ingest-book.ts --file /tmp/pg55.txt --slug the-wonderful-wizard-of-oz --prefix oz --book-id book-oz
 *   bun scripts/ingest-book.ts --se-dir /tmp/h-g-wells_the-time-machine --files chapter-1.xhtml,epilogue.xhtml \
 *     --slug the-time-machine --prefix ttm --book-id book-time-machine
 */

interface Args {
  file?: string;
  seDir?: string;
  files: string[];
  slug: string;
  prefix: string;
  bookId: string;
  headingRegex?: RegExp;
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
  const seDir = get("se-dir");
  const files = get("files");
  const slug = get("slug");
  const prefix = get("prefix");
  const usage = () => {
    console.error(
      "Usage: bun scripts/ingest-book.ts (--file <gutenberg.txt> [--heading-regex '<re>'] | --se-dir <repo> --files <a.xhtml,b.xhtml,...>) --slug <dir> --prefix <id-prefix> [--book-id <id>] [--from N] [--to N] [--force]",
    );
    process.exit(1);
  };
  if (!slug || !prefix) usage();
  if ((file ? 1 : 0) + (seDir ? 1 : 0) !== 1) usage();
  if (seDir && !files) usage();
  const headingRegex = get("heading-regex");
  // Group 1 is the contract; without it chapterNumber() would crash later
  // with an unrelated-looking undefined error.
  if (headingRegex && !/\((?!\?)/.test(headingRegex)) {
    console.error(
      "--heading-regex needs capture group 1 for the chapter number (optional group 2 = same-line title)",
    );
    process.exit(1);
  }
  return {
    file,
    seDir,
    files: files ? files.split(",").map((f) => f.trim()) : [],
    slug: slug!,
    prefix: prefix!,
    bookId: get("book-id") ?? `book-${prefix}`,
    headingRegex: headingRegex ? new RegExp(headingRegex) : undefined,
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
function parseChapters(raw: string, headingRegex = /^Chapter ([IVXLCDM]+|\d+)\.?$/): RawChapter[] {
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
    const heading = headingRegex.exec(line.trim());
    if (heading) {
      flush();
      current = {
        number: chapterNumber(heading[1]),
        title: heading[2]?.trim() ?? "",
        paragraphs: [],
      };
      chapters.push(current);
      pendingTitle = !current.title;
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

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Normalize extracted XHTML text: decode the handful of entities lol-html
 * leaves undecoded (SE files are literal UTF-8, so this is a safety net),
 * drop invisible word joiners, and demote typographic spaces (hair, no-break)
 * to plain ones before collapsing whitespace.
 */
function cleanText(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/g, (m, name: string) => NAMED_ENTITIES[name] ?? m)
    .replace(/\u2060/g, "")
    .replace(/[\u00a0\u200a]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pull the heading and prose paragraphs out of one Standard Ebooks chapter
 * file with Bun's built-in HTMLRewriter. SE headings are h2/h3 (or hgroup
 * children) whose epub:type distinguishes a bare ordinal ("I") from a real
 * title; prose is direct-child <p> of the section/article container. Endnote
 * reference markers (a[epub:type~=noteref]) are print apparatus, not prose.
 */
export function extractSeChapter(xhtml: string): {
  title: string;
  ordinal: string;
  paragraphs: string[];
} {
  const paragraphs: string[] = [];
  let current: string[] | null = null;
  const heading = { ordinal: [] as string[], title: [] as string[] };
  let headingSink: string[] | null = null;
  let suppress = 0;

  const flush = () => {
    if (!current) return;
    const text = cleanText(current.join(""));
    if (text) paragraphs.push(text);
    current = null;
  };

  new HTMLRewriter()
    .on("h2, h3, hgroup > p", {
      element(el) {
        const type = el.getAttribute("epub:type") ?? "";
        const sink = type.includes("ordinal") ? heading.ordinal : heading.title;
        headingSink = sink;
        el.onEndTag(() => {
          headingSink = null;
        });
      },
      text(t) {
        headingSink?.push(t.text);
      },
    })
    // Descendant `p` inside blockquote also reaches footer > p signatures;
    // dropping blockquotes once cost After Twenty Years its entire twist
    // note (letters, signs, and telegrams live in them). Bare <ol>/<ul> lists
    // carry prose too (Franklin's thirteen virtues with their precepts) —
    // blockquote-nested lists already match `blockquote p`, so only lists that
    // are direct children of the container need their own selector.
    .on(
      "section > p, article > p, section > blockquote p, article > blockquote p, section > ol li p, article > ol li p, section > ul li p, article > ul li p",
      {
        element(el) {
          flush();
          current = [];
          el.onEndTag(flush);
        },
        text(t) {
          if (suppress === 0) current?.push(t.text);
        },
      },
    )
    .on(
      "section > p a, article > p a, section > blockquote p a, article > blockquote p a, section > ol li p a, article > ol li p a, section > ul li p a, article > ul li p a",
      {
        element(el) {
          if ((el.getAttribute("epub:type") ?? "").includes("noteref")) {
            suppress += 1;
            el.onEndTag(() => {
              suppress -= 1;
            });
          }
        },
      },
    )
    // Tables carry prose too (Gatsby's Hopalong Cassidy schedule, Franklin's
    // daily plan): one row = one paragraph, cells separated by spaces. Pure
    // symbol grids (Franklin's virtue-examination dots) come out as noise and
    // are hand-cleaned during skeleton review.
    .on("section table tr, article table tr", {
      element(el) {
        flush();
        current = [];
        el.onEndTag(flush);
      },
    })
    .on("section table td, article table td, section table th, article table th", {
      element() {
        current?.push(" ");
      },
      text(t) {
        if (suppress === 0) current?.push(t.text);
      },
    })
    .transform(xhtml);
  flush();
  return {
    title: cleanText(heading.title.join("")),
    ordinal: cleanText(heading.ordinal.join("")),
    paragraphs,
  };
}

/** Parse the listed Standard Ebooks chapter files; list position = chapter number. */
function parseSeChapters(seDir: string, files: string[]): RawChapter[] {
  const nested = path.join(seDir, "src", "epub", "text");
  const textDir = fs.existsSync(nested) ? nested : seDir;
  return files.map((name, i) => {
    const number = i + 1;
    const { title, ordinal, paragraphs } = extractSeChapter(
      fs.readFileSync(path.join(textDir, name), "utf8"),
    );
    if (paragraphs.length === 0) {
      console.error(`No prose extracted from ${name} — unexpected Standard Ebooks markup?`);
      process.exit(1);
    }
    // chapterNumber() yields NaN for text that is neither digits nor roman
    // numerals — fall through to the filename rather than "Chapter NaN".
    const ordinalNumber = ordinal ? chapterNumber(ordinal) : NaN;
    if (ordinal && ordinalNumber !== number) {
      console.warn(
        `! ${name}: ordinal "${ordinal}" ≠ list position ${number} — check --files order`,
      );
    }
    let resolved = title;
    if (!resolved && Number.isFinite(ordinalNumber)) resolved = `Chapter ${ordinalNumber}`;
    if (!resolved) {
      resolved = path.basename(name, ".xhtml").replace(/[-_]+/g, " ");
      console.warn(`! ${name}: no heading found — using filename as title`);
    }
    return { number, title: resolved, paragraphs };
  });
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Greedy paragraph packing targeting 400-800 words per section: close a
 * section at 400 words, never exceed 800 unless a single paragraph does. A
 * runt final section (<150 words) merges into its predecessor.
 */
export function splitSections(paragraphs: string[]): string[][] {
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

// CLI entry — guarded so tests can import the parsers without running it.
if (import.meta.main) {
  const args = parseArgs(process.argv.slice(2));
  const chapters = args.seDir
    ? parseSeChapters(args.seDir, args.files)
    : parseChapters(fs.readFileSync(args.file!, "utf8"), args.headingRegex);
  if (chapters.length === 0) {
    console.error(
      "No chapters found — is this a Gutenberg text with 'Chapter N' headings? (--heading-regex overrides)",
    );
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
}
