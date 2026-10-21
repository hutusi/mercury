import { cn } from "@/lib/utils";

/**
 * Page header: a serif title, an optional muted gloss underneath, and an
 * actions slot that wraps below on narrow screens. `ipa`/`pos` keep the
 * dictionary-entry nod (the landing page's /ˈmɜːkjəri/ n.) as decorative
 * nodes, so the heading's accessible name is always exactly `title` — the
 * dictionary string the e2e suite asserts.
 */
export function EntryHeader({
  title,
  ipa,
  pos,
  gloss,
  eyebrow,
  actions,
  headingLevel = "h1",
  size = "lg",
  className,
}: {
  title: React.ReactNode;
  ipa?: string;
  pos?: string;
  gloss?: React.ReactNode;
  /** A small muted line above the title (e.g. today's date). */
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** "p" for decorative entries that must not enter the heading outline. */
  headingLevel?: "h1" | "h2" | "p";
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const Heading = headingLevel;
  const headingSize =
    size === "xl"
      ? "text-[2.5rem] leading-[1.12] sm:text-6xl"
      : size === "md"
        ? "text-[1.75rem] leading-tight sm:text-[2.125rem]"
        : "text-3xl leading-tight sm:text-[2.625rem]";

  return (
    <header className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-1.5 text-sm text-muted-foreground">{eyebrow}</div> : null}
          {ipa || pos ? (
            <div
              aria-hidden
              className="mb-3 flex flex-wrap items-baseline gap-x-2.5 text-muted-foreground"
            >
              {ipa ? <span className="font-serif text-lg italic">{ipa}</span> : null}
              {pos ? (
                <span className="font-serif text-sm font-semibold text-brand-ink italic">
                  {pos}
                </span>
              ) : null}
            </div>
          ) : null}
          <Heading className={cn("font-serif font-medium text-balance", headingSize)}>
            {title}
          </Heading>
          {gloss ? (
            <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{gloss}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
