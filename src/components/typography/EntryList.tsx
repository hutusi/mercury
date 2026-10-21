import { LocalizedLink } from "@/lib/i18n/LocalizedLink";
import { cn } from "@/lib/utils";

/** A list of content rows on a single raised card, hairline-divided. */
export function EntryList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function EntryRow({
  href,
  title,
  subtitle,
  meta,
  right,
  className,
}: {
  href?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small leading row: badges, tags. */
  meta?: React.ReactNode;
  /** Trailing slot: score, arrow, actions. */
  right?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        {meta ? <div className="mb-1.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
        <div className="font-serif text-lg leading-snug font-medium">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 text-[0.8125rem] text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      {right ? (
        <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground tabular-nums">
          {right}
        </div>
      ) : null}
    </>
  );

  return (
    <li className={className}>
      {href ? (
        <LocalizedLink
          href={href}
          className="group flex min-h-16 items-center gap-4 px-5 py-4 outline-hidden transition-colors duration-150 hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {body}
        </LocalizedLink>
      ) : (
        <div className="flex min-h-16 items-center gap-4 px-5 py-4">{body}</div>
      )}
    </li>
  );
}
