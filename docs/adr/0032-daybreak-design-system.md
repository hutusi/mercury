# ADR 0032: Daybreak design system, shell/flow layouts, and a Chinese heading webfont

**Status:** Accepted (2026-10). Supersedes the "Lexicon" rules in docs/DESIGN.md (2px radius, no shadows, cinnabar as the single accent, no CJK webfont, mono micro-labels).

## Context

Mercury's first design system, the Lexicon, set the app as a dictionary page: hairline rules, near-zero radius, no elevation, almost no motion, a cinnabar seal as the only colour. It made a coherent editorial site but a poor _learning app_:

- **No hierarchy of action.** The dashboard was a stack of equal-weight cards (plan, exam banner, recent scores, streak, due words, mistakes, quick links). The learner had to decide what to do; the product idea, "the tutor plans your day", was invisible.
- **Navigation didn't fit a phone.** Ten flat links became a horizontally scrolling strip on mobile, and learning sessions kept all navigation on screen.
- **Ambiguous signals.** Cinnabar marked wrong answers, the exam funnel, the active nav item, focus rings, and the streak at once, so red meant nothing in particular.
- **Uneven Chinese typography.** zh headings fell through to whatever serif the OS had (Songti, SimSun, Noto), so the same page looked different on every device.

The Claude Design project "Mercury Daybreak Redesign" (13 screens, light and dark) proposed a replacement, and it was adopted wholesale.

## Decision

- **Palette by meaning.** Warm paper and ink (OKLCH tokens in `src/app/globals.css`). **Dusk blue** (`brand`) marks progress and selection only: done stops, the current stop, chosen options, correct answers. **Coral** marks mistakes and the streak only: wrong answers, the mistakes badge, the flame. The one dark surface (`feature`) is the mock exam. Every token exists in light and dark (`.dark`, next-themes), and the design guard checks parity.
- **Shape and depth.** 8–24px radii, pill buttons, and a closed set of elevation tokens (`shadow-raised` for the current stop / flashcard / previews, `shadow-pop` for menus, `shadow-float` for toasts, `shadow-tab` for a selected segment, `shadow-lift` for card hover). Short colour and width transitions (≤ 450 ms) give feedback; anything moving is gated by `motion-reduce`.
- **Type.** IBM Plex Sans for the interface; Newsreader for headings, headwords, and passages; **Noto Serif SC 500/600 self-hosted as unicode-range slices** (`@fontsource/noto-serif-sc`) so zh headings render identically everywhere while a page downloads only the slices its glyphs need. zh body text stays on the platform sans (PingFang / YaHei / Noto Sans CJK): full CJK body fonts would cost far more than they add. No uppercase tracked labels; numbers use `tabular-nums` (Plex Mono and Inter are retired).
- **A route, not a menu.** Today's plan is drawn as a line of stops; only the current stop is a raised card with a primary action, every session shows "stop 2 of 4", every result names the next stop. (Persistence of the route is ADR 0033.)
- **Two layouts.** Authenticated routes split into route groups under the auth gate: `(shell)` hub pages get a grouped sidebar on desktop and four bottom tabs on phones (Today, Practice, Tutor, Mistakes); `(flow)` learning sessions get a nav-free frame with an exit, the route progress, and a counter.
- **Enforcement.** `src/lib/design-guard.test.ts` keeps the rules mechanical: semantic tokens only (no raw palette, no arbitrary colours), elevation tokens only, no gradients/backdrop blur/`transition-all`/smooth scroll/emoji/Google Fonts, gated animation, light/dark token parity.

## Consequences

- Every screen was rebuilt; screens absent from the prototype (writing, speaking, exams, books, settings, auth) were extrapolated in the same language.
- The cinnabar token, the seal wordmark, and the mono micro-label scale are removed (temporary aliases existed only while screens migrated).
- Chinese headings now cost a font download (a few slices, cached across pages, `font-display: swap`); zh body text is unchanged.
- e2e gained a mobile (Pixel 7) project for the bottom-tab shell; specs still assert dictionary strings through roles, so copy stays the contract.
