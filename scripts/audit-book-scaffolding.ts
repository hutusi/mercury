import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { BookChapterSchema, BookManifestSchema, type BookChapter } from "../src/content/types";

/**
 * Answer-shape and spoiler audit for book scaffolding (ADR 0024).
 *
 * The content tests in src/content/content.test.ts are the gate, but they only
 * speak at book scale and only after the fact: the pooled caps (uniquely
 * longest ≤45%, uniquely shortest ≤35%, each correct position 15-35%) need ≥40
 * questions, so a book can pass chapter by chapter and go red on its last one.
 * This prints the same numbers while the scaffolding is being written, so the
 * author steers instead of repairing. It reads the YAML directly rather than
 * through src/content/load.ts, so books not yet registered in BOOK_DIRS (which
 * no test covers) can be audited too.
 *
 * --review prints a chapter's summaryZh next to every stem and correct answer.
 * The rule that summaryZh must not state a fact any question asks for cannot be
 * checked mechanically — the summary is Chinese and the questions are English —
 * so the audit lays them out for one read instead of a scroll through YAML.
 *
 * Usage:
 *   bun scripts/audit-book-scaffolding.ts [<slug> ...]      # all books if omitted
 *   bun scripts/audit-book-scaffolding.ts --review <chapter-id>
 * Exits non-zero when a hard violation (one the content test would fail on) is found.
 */

const BOOKS_DIR = path.join(process.cwd(), "content", "books");

type Question = BookChapter["quiz"][number];

function chapterQuestions(chapter: BookChapter): Question[] {
  return [...chapter.sections.flatMap((s) => (s.checkIn ? [s.checkIn] : [])), ...chapter.quiz];
}

function loadChapters(slug: string): BookChapter[] {
  const dir = path.join(BOOKS_DIR, slug, "chapters");
  if (!fs.existsSync(dir)) throw new Error(`no such book: ${slug}`);
  // Read in manifest order when there is one — reading order is load-bearing
  // and a fs listing lies (chapter-10 sorts before chapter-2).
  const manifestPath = path.join(BOOKS_DIR, slug, "book.yaml");
  const files = fs.existsSync(manifestPath)
    ? BookManifestSchema.parse(parse(fs.readFileSync(manifestPath, "utf8"))).chapterFiles
    : fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".yaml"))
        .sort();
  return files.map((file) => {
    const raw: unknown = parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const result = BookChapterSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`${slug}/chapters/${file}: ${result.error.issues[0]?.message ?? "invalid"}`);
    }
    return result.data;
  });
}

// Keep every heuristic below in sync with the draft-time warnings in
// scripts/generate-book-questions.ts and the assertions in content.test.ts.
const POSITIONAL_RE =
  /(?:选项|答案)\s*(?:是|为)?\s*[0-9０-９①-⑩]|(?:选项|答案)\s*(?:是|为)?\s*[A-D](?![A-Za-z])|第\s*(?:[0-9０-９]+|[一二三四五六七八九十])\s*(?:个)?\s*(?:选项|答案)|option\s*[0-9]|option\s+[a-d](?![a-z])|(?:first|second|third|fourth)\s+option/i;

const TERMINAL_RE = /[.!?…。]$/;

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function auditChapter(chapter: BookChapter): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  const questions = chapterQuestions(chapter);

  for (const q of questions) {
    const lengths = q.options.map((o) => o.length);
    const longestDistractor = Math.max(...lengths.filter((_, i) => i !== q.correctIndex));
    if (lengths[q.correctIndex] > longestDistractor * 1.6) {
      hard.push(
        `${q.id}: correct option ${lengths[q.correctIndex]} chars vs longest distractor ${longestDistractor} (cap 1.6x)`,
      );
    }
    const punctuated = q.options.filter((o) => TERMINAL_RE.test(o.trim())).length;
    if (punctuated > 0 && punctuated < q.options.length) {
      hard.push(`${q.id}: options mix terminal punctuation (${punctuated}/${q.options.length})`);
    }
    if (POSITIONAL_RE.test(q.explanationZh)) {
      hard.push(`${q.id}: explanationZh references an option by position`);
    }
    const explanation = q.explanationZh.trim();
    if (explanation.length < 10 || !/[。！？”）)]$/.test(explanation)) {
      soft.push(`${q.id}: explanationZh looks empty or unterminated`);
    }
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) {
      hard.push(`${q.id}: duplicate options`);
    }
  }

  const quizCounts = [0, 0, 0, 0];
  for (const q of chapter.quiz) quizCounts[q.correctIndex] += 1;
  const n = chapter.quiz.length;
  const distinct = quizCounts.filter((c) => c > 0).length;
  if (distinct < Math.min(n, 4)) {
    hard.push(`${chapter.id}: quiz uses ${distinct} correct positions for ${n} questions`);
  }
  const cap = Math.ceil(n / 4);
  for (const [position, count] of quizCounts.entries()) {
    if (count > cap)
      hard.push(`${chapter.id}: position ${position} holds ${count}/${n} (cap ${cap})`);
  }

  // A quiz question whose stem+answer echoes a check-in's re-asks a fact the
  // reader was already shown mid-chapter; the quiz is meant to be fresh ground.
  const checkIns = chapter.sections.flatMap((s) => (s.checkIn ? [s.checkIn] : []));
  const checkInTokens = checkIns.map((c) => ({
    id: c.id,
    set: tokens(`${c.stem} ${c.options[c.correctIndex]}`),
  }));
  for (const q of chapter.quiz) {
    const set = tokens(`${q.stem} ${q.options[q.correctIndex]}`);
    for (const other of checkInTokens) {
      const shared = [...set].filter((t) => other.set.has(t)).length;
      if (shared / Math.min(set.size, other.set.size || 1) >= 0.5) {
        soft.push(`${q.id}: may repeat ${other.id}'s fact (token overlap)`);
      }
    }
  }

  const ids = questions.map((q) => q.id);
  if (new Set(ids).size !== ids.length) hard.push(`${chapter.id}: duplicate question ids`);
  if (!chapter.summaryZh) soft.push(`${chapter.id}: no summaryZh`);

  return { hard, soft };
}

function auditBook(slug: string): boolean {
  const chapters = loadChapters(slug);
  const hard: string[] = [];
  const soft: string[] = [];
  for (const chapter of chapters) {
    const result = auditChapter(chapter);
    hard.push(...result.hard);
    soft.push(...result.soft);
  }

  const questions = chapters.flatMap(chapterQuestions);
  const positions = [0, 0, 0, 0];
  let uniquelyLongest = 0;
  let uniquelyShortest = 0;
  // Terminal punctuation drifts book-wide: the per-question check above only
  // asks that the four options in one question agree with each other, so a pass
  // that strips every period stays green while every option turns into a
  // fragment. Compare each question against the book's own prevailing style.
  const optionsTotal = questions.reduce((n, q) => n + q.options.length, 0);
  let optionsPunctuated = 0;
  for (const q of questions) {
    positions[q.correctIndex] += 1;
    const lengths = q.options.map((o) => o.length);
    const correct = lengths[q.correctIndex];
    const distractors = lengths.filter((_, i) => i !== q.correctIndex);
    if (correct > Math.max(...distractors)) uniquelyLongest += 1;
    if (correct < Math.min(...distractors)) uniquelyShortest += 1;
    optionsPunctuated += q.options.filter((o) => TERMINAL_RE.test(o.trim())).length;
  }
  const total = questions.length;
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  const pooled = total >= 40;

  console.log(`\n${slug} — ${chapters.length} chapters, ${total} questions`);
  console.log(
    `  positions        ${positions.map((c, i) => `${i}:${c} (${pct(c)})`).join("  ")}${pooled ? "  [each 15-35%]" : "  [pooled caps need 40+]"}`,
  );
  console.log(
    `  uniquely longest ${uniquelyLongest}/${total} = ${pct(uniquelyLongest)} [cap 45%]   uniquely shortest ${uniquelyShortest}/${total} = ${pct(uniquelyShortest)} [cap 35%]`,
  );
  const punctuatedShare = optionsPunctuated / optionsTotal;
  // Reported, not enforced. This number cannot catch a pass that restyles a
  // whole book — strip every period and it reads 0%, add one everywhere and it
  // reads 100%, and both are internally consistent. Enforcing a house style
  // needs the content normalised first (books currently run 23%-100%); until
  // then this is a figure to read, and a jump between runs is the signal.
  console.log(
    `  options ending in terminal punctuation ${optionsPunctuated}/${optionsTotal} = ${((punctuatedShare || 0) * 100).toFixed(1)}%`,
  );
  if (pooled) {
    for (const [position, count] of positions.entries()) {
      const share = count / total;
      if (share < 0.15 || share > 0.35) {
        hard.push(
          `pooled: position ${position} holds ${count}/${total} correct answers (${pct(count)})`,
        );
      }
    }
    if (uniquelyLongest / total > 0.45)
      hard.push(`pooled: uniquely longest ${pct(uniquelyLongest)} > 45%`);
    if (uniquelyShortest / total > 0.35)
      hard.push(`pooled: uniquely shortest ${pct(uniquelyShortest)} > 35%`);
  }

  for (const line of hard) console.log(`  ✗ ${line}`);
  for (const line of soft) console.log(`  ? ${line}`);
  if (!hard.length && !soft.length) console.log("  clean");
  return hard.length === 0;
}

function review(chapterId: string): void {
  for (const slug of fs.readdirSync(BOOKS_DIR)) {
    if (!fs.statSync(path.join(BOOKS_DIR, slug)).isDirectory()) continue;
    const chapter = loadChapters(slug).find((c) => c.id === chapterId);
    if (!chapter) continue;
    console.log(`\n${chapter.id} — ${chapter.title} / ${chapter.titleZh}`);
    console.log(`summaryZh: ${chapter.summaryZh ?? "(none)"}\n`);
    console.log("Every fact below must be absent from that summary:");
    for (const section of chapter.sections) {
      if (!section.checkIn) continue;
      const c = section.checkIn;
      console.log(`  [${section.id}] ${c.stem}\n      → ${c.options[c.correctIndex]}`);
    }
    for (const q of chapter.quiz) {
      console.log(`  [quiz] ${q.stem}\n      → ${q.options[q.correctIndex]}`);
    }
    return;
  }
  throw new Error(`no such chapter: ${chapterId}`);
}

function main(): void {
  const argv = process.argv.slice(2);
  const reviewIndex = argv.indexOf("--review");
  if (reviewIndex !== -1) {
    const chapterId = argv[reviewIndex + 1];
    if (!chapterId) throw new Error("--review needs a chapter id");
    review(chapterId);
    return;
  }
  const slugs = argv.length
    ? argv
    : fs.readdirSync(BOOKS_DIR).filter((f) => fs.statSync(path.join(BOOKS_DIR, f)).isDirectory());
  let ok = true;
  for (const slug of slugs) ok = auditBook(slug) && ok;
  console.log("");
  if (!ok) {
    console.error("Hard violations found — the content tests will fail on these.");
    process.exit(1);
  }
}

main();
