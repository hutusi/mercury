import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route-transition placeholder in the Lexicon idiom: a headword-sized
 * title bar over a hairline gloss, then a few divided rows — so the shell never
 * flashes blank while a server page renders. Decorative (aria-hidden); the
 * destination content is announced when it arrives.
 */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="border-b border-border pb-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-72" />
      </div>
      <div className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
