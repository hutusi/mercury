# AGENTS.md

Mercury: bilingual (zh/en) English-learning app positioned as 最懂你的 AI 英语私教 — exam prep (TOEIC/IELTS) acquires users, business English retains them, and the AI tutor (learner model + daily plan + memory-infused feedback + chat) is the core mechanic. Next.js 16 App Router + Postgres/Drizzle + better-auth + Claude API.

## Commands

```bash
bun run dev                # dev server (Next runs under Node)
bun run build              # production build (required before test:e2e)
bun run lint / lint:fix    # ESLint flat config (Next 16 has no `next lint`)
bun run format[:check]     # Prettier + Tailwind class sorting
bun run typecheck          # tsc --noEmit (after a build — needs the generated .next/types)
bun run test               # bun unit tests — scoped to src/, DB-free
bun run test:e2e           # Playwright (port 3100, scratch DB in .e2e/)
bun run db:migrate / db:generate / db:seed / db:studio
bun run db:push            # local schema prototyping only — never CI/CD/Neon
bun run content:schemas    # regenerate content/.schemas/ after editing src/content/types.ts
bun run content:audio      # re-render listening audio → Vercel Blob after editing scripts (needs BLOB_READ_WRITE_TOKEN + DASHSCOPE_API_KEY; commit the manifest only)
bun run content:audio:prune # sweep unreferenced blobs — ONLY after the change deployed and prod was reseeded (old hashes serve prod until then)
```

## Workflow

- **Verify gate** (all green before anything lands on `main`; CI runs the same list): `lint && format:check && test && build && typecheck && test:e2e`.
- Conventional Commits with why-bodies; no AI-attribution trailers or PR lines. Branch (`<type>/<topic>`) only for big work; small fixes commit straight to `main`.
- **Docs ship with the change.** Update whichever page in the Docs index tracks what you touched; record hard-to-reverse decisions (foundational tech, integrity model, cross-cutting convention) as a new ADR in `docs/adr/`.
- Pushing and opening PRs are user-authorized — don't do either unless asked.

## Architecture

- **Auth is four layers**: `src/proxy.ts` (cookie check, UX only) → `(app)/layout.tsx` (real session) → **every server action calls `requireUser()`** (layouts don't protect actions) → **every `/api/v1` route calls `requireUserApi()`/`requireOnboardedApi()`** (401/403 envelopes, bearer tokens for native clients; the onboarding gate is `getOnboardedState()` — `settings.onboardedAt` + `learner_profiles.goalTrack`).
- **One implementation, two transports**: mutation bodies live in `src/lib/services/*`, reads in `src/lib/queries/*` (both userId-scoped, never `"use server"`). Server actions and `/api/v1` route handlers are thin wrappers over them — new features land as service/query first. The API contract is `docs/api/openapi.yaml` (drift-guarded by a bun test); client guide in docs/API.md.
- Content pipeline: YAML in `content/` → `src/content/load.ts` (zod schemas in `src/content/types.ts`) → `bun run db:seed` upserts by stable slug id. **Ids are load-bearing** — progress rows and exam answer maps reference them; never rename (see docs/CONTENT.md). The loader is tooling-only (seed + tests; guard test enforces it); after editing `types.ts`, run `bun run content:schemas` to regenerate the editor JSON Schemas.
- Exam integrity: clients only ever get `sanitizeSections()` output (no `correctIndex`/explanations); deadlines and grading are server-side (`src/lib/services/exams.ts`, `src/lib/exam-utils.ts`).
- AI: server-only, behind the `src/lib/ai/client.ts` facade. Two transports (ADR 0011): Anthropic (`messages.parse` + `zodOutputFormat`, schema server-enforced) and Bailian GLM (`openai` SDK on the DashScope compatible-mode endpoint, JSON mode + prompt-embedded schema + zod validation + one repair retry). Provider from `MERCURY_AI_PROVIDER` or key auto-detect (`ANTHROPIC_API_KEY` before `DASHSCOPE_API_KEY`); any failure degrades to `self_assessed` + model-answer/checklist UI. No key in dev/CI is a supported path.
- i18n: zh dictionary is the source of truth (`src/lib/i18n/dictionaries.ts`); `Dictionary` type derives from it. Server: `getDict()`; client: `useT()`. Locale comes from the cookie server-side — never `navigator.language`.
- Learner model (ADR 0012): `learner_profiles` holds client-writable goals + **server-owned** `skillEstimates`/`coachMemo`, evolved only via `src/lib/learner-model-core.ts` (EWMA signals hooked into services with `recordSkillSignalSafely` — guarded, never fails the parent mutation; memo updates ride the grading call's optional `memoUpdate`). The dashboard 今日计划 comes from `src/lib/plan-core.ts` — deterministic rules, deliberately not an AI call. Tutor chat (ADR 0013): single rolling thread, non-streaming, per-user daily cap `MERCURY_CHAT_DAILY_LIMIT` (default 30) → 429 `chat_limit_reached`.

## Design system

UI follows the Lexicon design system (docs/DESIGN.md), enforced by `src/lib/design-guard.test.ts`:

- Compose `src/components/typography/*` (EntryHeader, SectionLabel, Stat, EntryList) and `ui/*` primitives; feature components live under `src/components/<feature>/`.
- Color only via semantic tokens — red only via `cinnabar`, never mapped onto shadcn's `--accent`. No shadows, gradients, raw palette classes, or new animation.

## Gotchas

- **Keep unit tests DB-free (convention).** The DB driver is now `node-postgres` (Bun-loadable), so importing `src/lib/db` no longer crashes under Bun — but unit tests still must not reach it, to stay hermetic and DB-independent (put pure logic in separate modules like `src/lib/streak-core.ts`). Local dev/CI/e2e need a running Postgres (see `docker-compose.yml`); the seed still runs under Node via `bunx tsx`.
- `"use server"` files may export **async functions only** — a sync export breaks the build.
- `bun test` must stay scoped to `src` (`bun test src`): Bun's runner also matches `e2e/*.spec.ts` and crashes on Playwright imports.
- `DATABASE_URL` selects the Postgres database — Neon's pooled string in prod, a local/containerized Postgres in dev/CI/e2e. The `pg.Pool` connects lazily, so `next build` and unit-test collection don't require it.
- Schema changes ship as versioned migrations (`bun run db:generate`, committed under `drizzle/`), applied automatically by `bun run db:migrate` — CI, e2e, and the Vercel `vercel-build` step all run it. `db:push` is for local prototyping only; never point it at a shared database (see [ADR 0008](docs/adr/0008-versioned-migrations-on-deploy.md)).
- Speech APIs (TTS/STT) are client-only: components gate on a `mounted` effect state to avoid hydration mismatches; TTS speaks one utterance per script line and must cancel on unmount. Listening exercises prefer pre-generated MP3s on Vercel Blob (ADR 0021/0022: `content:audio` uploads by content hash, commits only `content/audio-manifest.json`; seed links a relative `audio_url` on a fresh hash; queries prefix `MERCURY_AUDIO_BASE_URL`) with browser TTS as the fallback — after editing a listening script, regenerate or the exercise silently degrades. `public/audio/` is a gitignored local render cache, never committed.
- **React 19 ref callbacks that return a cleanup must be identity-stable** (`useCallback`): a new callback identity re-runs the previous cleanup on every render. An inline `<audio>` ref whose cleanup called `pause()` paused playback on the play click's own re-render, rejected `play()` with AbortError, and falsely degraded to TTS (see `TtsPlayer.attachAudio`). Treat `play()` rejections without `el.error` as benign — never a reason to degrade.
- `src/lib/db/auth-schema.ts` is generated by `@better-auth/cli` — regenerate, don't hand-edit. Plugin order: `bearer()` before `nextCookies()`, and `nextCookies()` stays last.
- API clients must be cookie-free (bearer header only) — a stored session cookie without an `Origin` header trips better-auth's CSRF check. The e2e helper `apiSignUp()` uses a throwaway context for exactly this reason.
- Sonnet 5 rejects `temperature`/`top_p`/`top_k` — don't add sampling params to AI calls.
- **Never call `revalidatePath` inside a server action** here: revalidating the root layout wedges the caller's awaited transition indefinitely under `next start` (button stuck disabled; reproduced 9/9). Pages are fully dynamic — have the client fire `router.refresh()` in a separate, non-gating transition instead (see `ReminderToggle`/`GoalEditor`).
- `memoUpdate` on the feedback schemas must stay **optional** — stored feedback jsonb rows predate it and would violate the column type otherwise.
- GLM structured output only works in **non-thinking mode** — the Bailian transport always sends `enable_thinking: false`; never enable thinking on that path. `MERCURY_AI_MODEL` is provider-specific: clear it when switching `MERCURY_AI_PROVIDER` or the wrong model id gets sent.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — runtime split, directory map, data model, auth chain, exam integrity, AI degradation, SRS/streaks
- [docs/API.md](docs/API.md) — the v1 HTTP API for native clients: bearer auth flow, error envelope, exam timing model, degradation contract; spec in [docs/api/openapi.yaml](docs/api/openapi.yaml)
- [docs/CONTENT.md](docs/CONTENT.md) — content model, id conventions, authoring rules per kind, validation, seed workflow
- [docs/DESIGN.md](docs/DESIGN.md) — the Lexicon design system: palette & cinnabar rules, type, components, motion, a11y floor
- [docs/adr/](docs/adr/) — decision records (Bun+Node split, SQLite+Drizzle, SM-2, homegrown i18n, server-issued deadlines, AI degradation, Postgres/Neon for serverless, versioned migrations, YAML content authoring, HTTP API v1 + bearer auth, multi-provider AI, learner model + AI memory, tutor chat, track as goal + content filter, pre-generated listening audio, audio on Vercel Blob)
- [CONTRIBUTING.md](CONTRIBUTING.md) — prerequisites, setup, scripts table, testing guide
