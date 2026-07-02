import { cn } from "@/lib/utils";

/**
 * The signature Lexicon element: a page title set as a dictionary entry —
 * serif headword, italic IPA, part-of-speech tag in cinnabar, and a gloss
 * line, closed by a hairline rule.
 *
 * On pages whose heading text is asserted by e2e tests, `title` must be the
 * exact dictionary string; IPA/POS render as separate decorative nodes so the
 * accessible name never changes.
 */
export function EntryHeader({
  title,
  ipa,
  pos,
  gloss,
  actions,
  headingLevel = "h1",
  size = "lg",
  className,
}: {
  title: React.ReactNode;
  ipa?: string;
  pos?: string;
  gloss?: React.ReactNode;
  actions?: React.ReactNode;
  /** "p" for decorative entries that must not enter the heading outline. */
  headingLevel?: "h1" | "h2" | "p";
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const Heading = headingLevel;
  const headingSize =
    size === "xl" ? "text-6xl sm:text-7xl" : size === "md" ? "text-3xl" : "text-4xl sm:text-5xl";

  return (
    <header className={cn("border-b border-border pb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Heading
              className={cn("font-serif font-medium tracking-tight text-balance", headingSize)}
            >
              {title}
            </Heading>
            {ipa ? (
              <span
                aria-hidden
                className={cn(
                  "font-serif text-muted-foreground italic",
                  size === "xl" ? "text-2xl" : size === "md" ? "text-base" : "text-lg",
                )}
              >
                {ipa}
              </span>
            ) : null}
            {pos ? (
              <span
                aria-hidden
                className="font-mono text-2xs font-medium tracking-label text-cinnabar uppercase"
              >
                {pos}
              </span>
            ) : null}
          </div>
          {gloss ? (
            <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">{gloss}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
