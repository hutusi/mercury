# Mercury design system — "The Lexicon"

Mercury's raw material is words in two languages, and its core loop is being graded. The app therefore looks like a beautifully set dictionary page marked by a teacher's red pen: warm paper and ink, one cinnabar accent (朱砂, seal red), serif headwords, mono data, hairline rules, near-zero radius, no shadows, almost no motion.

The rules below are enforced by `src/lib/design-guard.test.ts` (part of `bun run test`). If you hit a guard failure, the fix is almost always "use a token or an existing component", not "allowlist it".

## Palette

All color flows through semantic tokens in `src/app/globals.css` (Tailwind v4 `@theme`, OKLCH, full light + dark sets). Never use raw Tailwind palette classes (`bg-amber-50`, `text-green-600`, …).

| Token                            | Light                      | Dark                                              | Role                                   |
| -------------------------------- | -------------------------- | ------------------------------------------------- | -------------------------------------- |
| `background` / `foreground`      | paper `0.972 0.006 90`     | near-black `0.205 0.01 90`                        | page / ink                             |
| `primary`                        | ink                        | paper-tone (inverted)                             | workhorse filled buttons, links, fills |
| `muted` / `secondary` / `accent` | warm tint `0.925 0.008 90` | `0.275 0.01 90`                                   | quiet fills, menu hovers               |
| `border`                         | hairline `0.88 0.008 90`   | solid `0.32 0.012 90`                             | all rules and dividers                 |
| `cinnabar`                       | `0.52 0.17 32`             | `0.68 0.15 32`                                    | THE accent — see rules below           |
| `cinnabar-foreground`            | near-white                 | **page tone** (white fails AA on bright cinnabar) | text on cinnabar fills                 |
| `ring`                           | = cinnabar                 | = cinnabar                                        | focus                                  |
| `destructive`                    | deep red `0.5 0.19 27`     | `0.66 0.17 25`                                    | errors only                            |

`--radius` is `0.125rem` (2px). No `rounded-xl` or larger; `rounded-full` only for dots.

### Cinnabar rules

Cinnabar is the single memorable thing on the page. It appears **only** at signature moments:

- the mock-exam funnel (banners, exam rows, `Button`/`Badge` `variant="accent"`),
- wrong-answer marks — the teacher's red pen (strikes, X icons, `text-cinnabar`),
- the streak flame, the active nav marker, focus rings, the seal wordmark.

Everything else stays ink. Correct answers are quiet ink `Check` icons — never green; icons and shape carry meaning, not color alone. `--cinnabar` is deliberately **not** shadcn's `--accent`: that slot drives dropdown/select hover tints and must stay a neutral paper tint.

## Type

Three Latin faces, bundled under `src/app/fonts/` and loaded in `src/app/[locale]/layout.tsx` via `next/font/local`. Keeping the assets in the repository makes production builds deterministic and network-independent; attribution and the SIL OFL 1.1 license live beside the files.

| Face              | Utility      | Role                                                                                                            |
| ----------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| **Newsreader**    | `font-serif` | headwords, page/card titles, passages, model answers; _italic_ for IPA                                          |
| **IBM Plex Mono** | `font-mono`  | every numeral (`tabular-nums`), timers, scores, 11px tracked micro-labels (`text-2xs tracking-label uppercase`) |
| **Inter**         | `font-sans`  | body and UI chrome                                                                                              |

Chinese loads **no webfont** (megabytes per weight for no visual win): zh display falls through to the platform serif ("Songti SC" / "Noto Serif SC" / "SimSun") and zh body to PingFang/YaHei via the `--font-sans` stack. `--font-heading` points at the serif, so `CardTitle` is serif for free.

Long-form learner prose — reading passages, book chapters, exam passages — is always `PassageText` (serif at `text-lg`/18px, `leading-relaxed`): Newsreader's small x-height reads below its nominal size, and extended reading wants the larger measure. UI chrome and support text (listening transcripts, prompts, options) stay at the default 16px/14px.

## Layout

Editorial: hairline dividers (`border-y` / `divide-y divide-border`) instead of boxed cards; generous whitespace; asymmetry where it helps (dashboard main column + 16rem marginalia rail). Chrome is solid paper — no `backdrop-blur`, no gradients, no shadows anywhere.

## Components

Compose these before writing inline Tailwind. Signature pieces live in `src/components/typography/`:

- **`EntryHeader`** — the signature: a page title set as a dictionary entry (serif headword, italic IPA, cinnabar POS tag, gloss, hairline rule). IPA/POS strings come from the `entry.*` dictionary keys and render `aria-hidden`, so the accessible heading name is exactly the dictionary string the e2e suite asserts.
- **`SectionLabel`** — mono 11px uppercase tracked label for section headings, table heads, stat captions.
- **`PassageText`** — the long-form prose body (18px serif, relaxed leading, `whitespace-pre-line`); every reading/book/exam passage renders through it.
- **`Stat`** — mono tabular figure with optional unit/label; a `size` (`sm`–`xl`) and `align` (`start`/`center`) scale for hero figures vs the marginalia rail; `accent` for cinnabar.
- **`EntryList` / `EntryRow`** — hairline-divided rows replacing card grids on list pages.
- **`EmptyState`** — centered hairline empty block, with an optional `action` slot: an empty state must never dead-end (lift the filter, route to content).
- **`NextStepFooter`** (`src/components/exercise/`) — the post-score router used by reading, listening, the vocab quiz, and the exam report: next unattempted item, review-this-attempt's-mistakes, back link.
- `src/components/layout/`: `SkipLink` (targets `#main-content`), the seal `Wordmark` (square cinnabar tile — the brand's only filled-red surface), `PageSkeleton` (route-transition placeholder), `ErrorState` (shared error-boundary body).
- `src/components/ui/`: flattened shadcn primitives; `Button` and `Badge` have an `accent` (cinnabar) variant for funnel CTAs. **`PasswordInput`** wraps `Input` with the eye reveal toggle — every password field uses it (no confirm-password twins by design). **`Callout`** is the one bordered-notice box — `accent` (cinnabar funnel/self-assess), `error` (destructive; defaults to `role="alert"` so async failures are announced), and `muted` — replacing the box that was hand-rolled across features.

## Motion

`transition-colors` only. The sole animations are the exam timer's sub-minute pulse and the recording dot, both paired with `motion-reduce:animate-none`. No entrance animations, hover lifts, or shadows-on-hover — over-animation is noise. The design guard also rejects `transition-all`, smooth-scroll (`behavior: "smooth"`), and emoji glyphs — icons are always lucide components, so they carry a role and inherit ink. One exception: third-party brand marks (the Google/GitHub sign-in buttons) don't exist in lucide, so they're monochrome inline SVGs on `currentColor` with `aria-hidden` — the ink rule still applies, never the brand's colors.

## Accessibility floor

- WCAG AA contrast in both themes; `muted-foreground` stays at L ≤ 0.5 (light) / ≥ 0.71 (dark); dark `cinnabar-foreground` is page-toned because white on bright cinnabar is ~2.9:1.
- Focus is a 2px cinnabar ring with offset on buttons/links, borderless ring on fields.
- **Focus follows async view swaps**: when a submit replaces the view (exercise results, quiz done, exam section advance), the new container takes focus (`tabIndex={-1}` + `.focus()` from a mount effect, or rAF-deferred when the call site is imperative and the node doesn't exist yet) so keyboard and screen-reader users aren't stranded on a control that no longer exists.
- Skip link as the shell's first element; `<main id="main-content">`.
- Correct/wrong state always carries an icon or shape in addition to color.
- Textareas have persistent programmatic labels; placeholders are hints, never labels.
- Selection and disclosure buttons expose state with `aria-pressed` / `aria-expanded`, and async failures or progress use alert/status live regions.
