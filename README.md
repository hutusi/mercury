# Mercury

**考试为始，职场为终** — An English-learning web app for native Chinese-speaking business professionals.

Mercury acquires users through exam prep (**TOEIC** and **IELTS** tracks) and retains them with practical **Business English**. Every surface is bilingual: learning material is English, scaffolding (translations, explanations, feedback) is Simplified Chinese, and the UI chrome switches between 中文 and English.

## Features

- **Vocabulary** — 150 seeded words across three tracks with SM-2 spaced-repetition flashcards and self-grading quizzes
- **Reading** — exam-style passages (TOEIC Part 7 emails/memos, IELTS academic, business articles) with server-graded questions and Chinese explanations
- **Listening** — dialogues and talks played through browser text-to-speech with per-speaker voices; transcripts unlock after submission
- **Writing** — IELTS Task 1/2, TOEIC essays, and business emails/reports graded by Claude with band scores, line-level issues, and rewritten samples
- **Speaking** — browser speech recognition transcribes your answer; Claude coaches fluency, vocabulary, and grammar with more natural phrasings
- **Mock Exam Mode** — timed mini-TOEIC (25Q) and mini-IELTS (23Q) with server-validated section deadlines, auto-submit on expiry, refresh-safe resume, scaled score / band estimates, and wrong-answer review

AI feedback degrades gracefully: without an `ANTHROPIC_API_KEY`, writing and speaking fall back to model answers plus bilingual self-assessment checklists.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 · Tailwind CSS 4 · SQLite + Drizzle ORM · better-auth · Claude API (`@anthropic-ai/sdk`) · Web Speech API · Bun (package manager / scripts; Next runs under Node)

## Getting started

```bash
bun install

# Configure environment
cp .env.example .env
# set BETTER_AUTH_SECRET (e.g. `openssl rand -base64 32`)
# optionally set ANTHROPIC_API_KEY to enable AI feedback

# Create and seed the database (data/mercury.db)
bun run db:push
bun run db:seed

bun run dev
```

Open http://localhost:3000, register an account, pick a track, and start studying.

> Speech features use the Web Speech API: text-to-speech works in all major browsers; speech recognition (speaking practice) requires Chrome or Edge. The microphone needs localhost or HTTPS.

## Scripts

| Script                                            | Purpose                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bun run dev` / `bun run build` / `bun run start` | Next.js dev / production build / serve                                                     |
| `bun run db:push`                                 | Apply the Drizzle schema to SQLite                                                         |
| `bun run db:seed`                                 | Load/refresh seed content (idempotent; runs via tsx because Bun can't load better-sqlite3) |
| `bun run db:studio`                               | Browse the database in Drizzle Studio                                                      |
| `bun test`                                        | Unit tests (SRS scheduler, score mapping, exam grading/sanitization)                       |

## Architecture notes

- **Auth** — better-auth with email/password. `src/proxy.ts` does an optimistic cookie check; the `(app)` layout does the authoritative session lookup; every server action re-verifies via `requireUser()`.
- **Content** — authored as typed TS in `src/content/` (zod-validated), upserted into SQLite by stable slug ids. Progress rows reference content ids.
- **Exam integrity** — answer keys never reach the client during an attempt; deadlines are issued and enforced server-side (late answers are discarded beyond a 30s grace window); grading and score estimation run against unsanitized content on the server.
- **AI** — Claude is called only from server actions using structured outputs (`messages.parse` + `zodOutputFormat`), so feedback arrives schema-validated. Model defaults to `claude-sonnet-5`, overridable via `MERCURY_AI_MODEL`.
