import { LocalizedLink } from "@/lib/i18n/LocalizedLink";
import { cn } from "@/lib/utils";

/** Hairline-divided list — the editorial replacement for card grids. */
export function EntryList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul className={cn("divide-y divide-border border-y border-border", className)}>{children}</ul>
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
  /** Small leading row: badges, mono tags. */
  meta?: React.ReactNode;
  /** Trailing slot: score, arrow, actions. */
  right?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        {meta ? <div className="mb-1.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
        <div className="font-serif text-lg font-medium">{title}</div>
        {subtitle ? <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {right ? (
        <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
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
          className="group flex items-center gap-4 py-5 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {body}
        </LocalizedLink>
      ) : (
        <div className="flex items-center gap-4 py-5">{body}</div>
      )}
    </li>
  );
}
