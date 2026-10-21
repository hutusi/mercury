import { Check } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

/*
 * Shared pieces of the skill hub lists (reading, listening, writing,
 * speaking): one status vocabulary across them — done in dusk blue with a
 * check, not yet in muted text.
 */

/** A hub row's trailing status. */
export function RowStatus({ done, children }: { done: boolean; children: React.ReactNode }) {
  return done ? (
    <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-brand-ink">
      <Check className="size-4" aria-hidden />
      {children}
    </span>
  ) : (
    <span className="text-xs">{children}</span>
  );
}

/** The empty state's way out of a narrowing filter. */
export function ViewAllLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center rounded-sm text-sm font-medium text-brand-ink underline-offset-4 outline-hidden transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}
