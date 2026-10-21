# Mercury design system — "Daybreak" 晨光

Warm paper and ink, one dusk-blue accent for progress, coral for mistakes and the streak. Each day is drawn as a route of stops, so a learner always knows where they are and what comes next. ([ADR 0032](adr/0032-daybreak-design-system.md))

The rules below are enforced by `src/lib/design-guard.test.ts` (part of `bun run test`). If a guard fails, the fix is almost always "use a token or an existing component", not "allowlist it".

## Colour

All colour flows through semantic tokens in `src/app/globals.css` (Tailwind v4 `@theme`, OKLCH, a full light set on `:root` and a dark set on `.dark` — the guard checks both define the same variables). Never use raw Tailwind palette classes (`bg-amber-50`) or arbitrary colours (`bg-[#…]`, `oklch(…)` in a class).

| Token                                            | Role                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background` / `foreground`                      | paper / ink                                                                                                                                             |
| `card`, `popover`                                | raised surfaces (cards, menus)                                                                                                                          |
| `muted` / `secondary`                            | sunken fills (example boxes, explanations)                                                                                                              |
| `track`                                          | the groove behind segmented controls and progress bars                                                                                                  |
| `accent`                                         | neutral hover tint (shadcn's slot — never a colour)                                                                                                     |
| `muted-foreground`                               | meta text (AA on paper and on `muted`)                                                                                                                  |
| `soft`, `soft-2`, `soft-3`                       | secondary prose, stronger than meta text                                                                                                                |
| `border` / `input`                               | hairlines / field and outline-button borders                                                                                                            |
| `primary` (+ `primary-hover`)                    | ink pill buttons — the primary action                                                                                                                   |
| `brand` (+ `-soft`, `-mid`, `-ink`, `-border`)   | **dusk blue: progress and selection only** — done/current stops, route segments, chosen options, correct answers, focus ring, the station-node wordmark |
| `coral` (+ `-soft`, `-ink`)                      | **mistakes and the streak only** — wrong answers, "added to mistakes", the mistakes count badge, the flame, the weakest-skill flag                      |
| `feature` (+ `-foreground`, `-muted`, `-accent`) | the one dark surface: the mock-exam card                                                                                                                |
| `destructive`                                    | errors that are not learner mistakes (network failures, validation)                                                                                     |

Correct/wrong always carries an icon or shape (check / x, strikethrough) in addition to colour.

## Type

| Face                      | Utility           | Role                                                       |
| ------------------------- | ----------------- | ---------------------------------------------------------- |
| **IBM Plex Sans**         | `font-sans`       | interface text (15px base, `tabular-nums` for every count) |
| **Newsreader**            | `font-serif`      | page titles, headwords, passages, stats; _italic_ for IPA  |
| **Noto Serif SC** 500/600 | (in `font-serif`) | Chinese headings, identical on every OS                    |

Latin faces are bundled under `src/app/fonts/` (`next/font/local`); Noto Serif SC comes from `@fontsource/noto-serif-sc` as unicode-range slices, so a page downloads only the glyph slices it uses. Chinese body text deliberately uses the platform sans (PingFang / YaHei / Noto Sans CJK). No uppercase tracked labels and no monospace labels: section labels are 15px semibold sans; buttons wrap and grids reflow so longer English strings never break a layout.

Long-form learner prose — reading passages, book chapters, exam passages — is `PassageText` (Newsreader ~19px, relaxed leading).

## Shape and depth

- Radii: `rounded-sm` 8 · `rounded-md` 12 · `rounded-lg` 16 · `rounded-xl` 20 · `rounded-2xl` 24; pills (buttons, chips, toggles) are `rounded-full`. No arbitrary radii.
- Elevation is a closed set: `shadow-raised` (the current stop, the flashcard, landing preview), `shadow-pop` (menus, popovers), `shadow-float` (toasts), `shadow-tab` (the selected segment of a segmented control), `shadow-lift` (hover on a practice card). Everything else sits flat on the paper with a hairline border.
- No gradients, no backdrop blur.

## Layout

- **Shell** (`(shell)` route group): a 248px sidebar on desktop (wordmark; Today; Practice with its skills nested beneath; Tutor; Mistakes with a coral count; the mini "today's plan" card; the avatar menu and 中/EN toggle), a 58px top bar plus four bottom tabs on phones (Today · Practice · Tutor · Mistakes). Content is centred, max ~1100px, generous padding.
- **Flow** (`(flow)` route group): learning sessions hide navigation. A 62px top bar holds an exit (×), "今日计划 · 第 2 站，共 4 站" (or "自由练习 · 不计入今日计划") above the segmented route, and a counter. Sticky elements offset by the `--chrome-top` variable.
- Every tap target is at least 44px tall; answer options and grade buttons are 46–64px.

## Components

Compose these before writing inline Tailwind (`src/components/ui/` and `src/components/typography/`); feature components live under `src/components/<feature>/`.

## Motion

Feedback, not decoration: colour/background/border transitions (~150–200 ms) on interactive elements, width transitions on progress bars (≤ 450 ms), opacity/translate on toasts. Anything that moves (`transition-[width]`, transforms, `animate-*`) is paired with `motion-reduce:` overrides. The guard rejects `transition-all`, smooth scrolling (`behavior: "smooth"`), durations above 450 ms, and emoji glyphs — icons are lucide components so they carry a role and inherit colour. Third-party brand marks (Google/GitHub sign-in) are monochrome inline SVGs on `currentColor`.

## Accessibility floor

- WCAG AA contrast in both themes; meta text uses `muted-foreground`, never a lighter ad-hoc tint.
- Focus is a 2px dusk-blue ring with offset on buttons and links.
- Focus follows async view swaps (results, section advances, finished sessions): the new container takes focus.
- Skip link first in both layouts; `<main id="main-content">`.
- Selection and disclosure controls expose `aria-pressed` / `aria-checked` / `aria-expanded`; segmented controls are radiogroups; async progress and failures use `status` / `alert` live regions; toasts are `role="status"`.
- Keyboard: Space flips a flashcard, 1–4 grade, U undoes, Enter starts the current stop, Esc exits a session; shortcuts are ignored inside inputs.
