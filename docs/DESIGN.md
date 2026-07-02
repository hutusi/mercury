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

Three faces, loaded in `src/app/[locale]/layout.tsx` via `next/font`:

| Face              | Utility      | Role                                                                                                            |
| ----------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| **Newsreader**    | `font-serif` | headwords, page/card titles, passages, model answers; _italic_ for IPA                                          |
| **IBM Plex Mono** | `font-mono`  | every numeral (`tabular-nums`), timers, scores, 11px tracked micro-labels (`text-2xs tracking-label uppercase`) |
| **Inter**         | `font-sans`  | body and UI chrome                                                                                              |

Chinese loads **no webfont** (megabytes per weight for no visual win): zh display falls through to the platform serif ("Songti SC" / "Noto Serif SC" / "SimSun") and zh body to PingFang/YaHei via the `--font-sans` stack. `--font-heading` points at the serif, so `CardTitle` is serif for free.

## Layout

Editorial: hairline dividers (`border-y` / `divide-y divide-border`) instead of boxed cards; generous whitespace; asymmetry where it helps (dashboard main column + 16rem marginalia rail). Chrome is solid paper — no `backdrop-blur`, no gradients, no shadows anywhere.

## Components

Compose these before writing inline Tailwind. Signature pieces live in `src/components/typography/`:

- **`EntryHeader`** — the signature: a page title set as a dictionary entry (serif headword, italic IPA, cinnabar POS tag, gloss, hairline rule). IPA/POS strings come from the `entry.*` dictionary keys and render `aria-hidden`, so the accessible heading name is exactly the dictionary string the e2e suite asserts.
- **`SectionLabel`** — mono 11px uppercase tracked label for section headings, table heads, stat captions.
- **`Stat`** — mono tabular figure with optional unit/label; `accent` for cinnabar.
- **`EntryList` / `EntryRow`** — hairline-divided rows replacing card grids on list pages.
- **`EmptyState`** — centered hairline empty block.
- `src/components/layout/`: `SkipLink` (targets `#main-content`), the seal `Wordmark` (square cinnabar tile — the brand's only filled-red surface).
- `src/components/ui/`: flattened shadcn primitives; `Button` and `Badge` have an `accent` (cinnabar) variant for funnel CTAs.

## Motion

`transition-colors` only. The sole animations are the exam timer's sub-minute pulse and the recording dot, both paired with `motion-reduce:animate-none`. No entrance animations, hover lifts, or shadows-on-hover — over-animation is noise.

## Accessibility floor

- WCAG AA contrast in both themes; `muted-foreground` stays at L ≤ 0.5 (light) / ≥ 0.71 (dark); dark `cinnabar-foreground` is page-toned because white on bright cinnabar is ~2.9:1.
- Focus is a 2px cinnabar ring with offset on buttons/links, borderless ring on fields.
- Skip link as the shell's first element; `<main id="main-content">`.
- Correct/wrong state always carries an icon or shape in addition to color.
