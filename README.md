# Mercury

**最懂你的 AI 英语私教：从托业 / 雅思备考，到职场实战** — The AI English tutor that knows you, for native Chinese-speaking business professionals.

Mercury acquires users through exam prep (**TOEIC** and **IELTS** tracks) and retains them with practical **Business English** — and an AI tutor is the core mechanic: a learner model tracks your goal, level, and weak spots; a daily plan decides what to study; feedback remembers your recurring mistakes; and a chat coach answers anytime. Every surface is bilingual: learning material is English, scaffolding (translations, explanations, feedback) is Simplified Chinese, and the UI chrome switches between 中文 and English.

## Features

- **AI Tutor** — a per-user learner model (goals, per-skill estimates, recurring-issue memory), a deterministic daily plan (今日计划) fitted to your minutes-per-day, memory-infused writing/speaking feedback, and a tutor chat with a daily message cap (`MERCURY_CHAT_DAILY_LIMIT`)
- **Vocabulary** — 300 seeded words across three tracks with SM-2 spaced-repetition flashcards and self-grading quizzes
- **Reading** — exam-style passages (TOEIC Part 7 emails/memos, IELTS academic, business articles) with server-graded questions and Chinese explanations
- **Listening** — dialogues and talks played through browser text-to-speech with per-speaker voices; transcripts unlock after submission
- **Writing** — IELTS Task 1/2, TOEIC essays, and business emails/reports graded by Claude with band scores, line-level issues, and rewritten samples
- **Speaking** — browser speech recognition transcribes your answer; Claude coaches fluency, vocabulary, and grammar with more natural phrasings
- **Mock Exam Mode** — timed TOEIC and IELTS exams in two lengths (mini 25Q/23Q, standard 50Q/44Q) with server-validated section deadlines, auto-submit on expiry, refresh-safe resume, scaled score / band estimates, and wrong-answer review

AI grading runs on Claude (`ANTHROPIC_API_KEY`) or Alibaba Bailian GLM (`DASHSCOPE_API_KEY`) and degrades gracefully: with neither key configured, writing and speaking fall back to model answers plus bilingual self-assessment checklists.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 · Tailwind CSS 4 · Postgres (Neon) + Drizzle ORM · better-auth · Claude API (`@anthropic-ai/sdk`) / Bailian GLM (`openai` SDK) · Web Speech API · Bun (package manager / scripts; Next runs under Node)

## Getting started

```bash
bun install

# Start a local Postgres (or bring your own / use a Neon branch)
docker compose up -d

# Configure environment
cp .env.example .env
# set DATABASE_URL (e.g. `postgresql://mercury:mercury@localhost:5432/mercury`)
# set BETTER_AUTH_SECRET (e.g. `openssl rand -base64 32`)
# optionally set ANTHROPIC_API_KEY (Claude) or DASHSCOPE_API_KEY (Bailian GLM) to enable AI feedback

# Apply migrations and seed content
bun run db:migrate
bun run db:seed

bun run dev
```

Open http://localhost:3000, register an account, pick a track, and start studying.

> Speech features use the Web Speech API: text-to-speech works in all major browsers; speech recognition (speaking practice) requires Chrome or Edge. The microphone needs localhost or HTTPS.

## Scripts

| Script                                            | Purpose                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `bun run dev` / `bun run build` / `bun run start` | Next.js dev / production build / serve                                                          |
| `bun run lint` / `bun run format`                 | ESLint / Prettier (with Tailwind class sorting)                                                 |
| `bun run typecheck`                               | TypeScript check (`tsc --noEmit`)                                                               |
| `bun run db:migrate`                              | Apply committed migrations to Postgres (runs automatically on Vercel deploy)                    |
| `bun run db:generate`                             | Snapshot a `schema.ts` change as a new versioned migration                                      |
| `bun run db:push`                                 | Push the schema directly to Postgres, no migration file — local prototyping only                |
| `bun run db:seed`                                 | Load/refresh seed content (idempotent; runs under Node via tsx)                                 |
| `bun run db:studio`                               | Browse the database in Drizzle Studio                                                           |
| `bun run test`                                    | Unit tests (SRS, scoring, exam grading, content validation, i18n parity, streaks, design guard) |
| `bun run test:e2e`                                | Playwright end-to-end suite (build first; runs on a scratch DB)                                 |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data model, auth layers, exam integrity, AI degradation
- [docs/DESIGN.md](docs/DESIGN.md) — the Lexicon design system: tokens, type, components, and the rules the design guard enforces
- [docs/CONTENT.md](docs/CONTENT.md) — how to author and seed learning content
- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, scripts, verify gate, commit conventions
- [docs/adr/](docs/adr/) — architecture decision records

## Architecture notes

- **Auth** — better-auth with email/password. `src/proxy.ts` does an optimistic cookie check; the `(app)` layout does the authoritative session lookup; every server action re-verifies via `requireUser()`.
- **Content** — authored as YAML in `content/` (zod-validated via `src/content/load.ts`), upserted into Postgres by stable slug ids. Progress rows reference content ids.
- **Exam integrity** — answer keys never reach the client during an attempt; deadlines are issued and enforced server-side (late answers are discarded beyond a 30s grace window); grading and score estimation run against unsanitized content on the server.
- **AI** — grading is server-only behind a provider facade (`src/lib/ai/client.ts`): Claude uses server-enforced structured outputs (`messages.parse` + `zodOutputFormat`); Bailian GLM uses the OpenAI-compatible endpoint with JSON mode + zod validation. Provider auto-detects from the configured key (`MERCURY_AI_PROVIDER` overrides); model defaults to `claude-sonnet-5` / `glm-5.2` (`MERCURY_AI_MODEL` overrides).
