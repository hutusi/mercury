import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { ExamTrackFilter, TrackFilter } from "@/lib/track-filter";
import { cn } from "@/lib/utils";

/**
 * Per-feature track filter: a row of link chips over ?track=. Server-rendered —
 * list pages are fully dynamic, so a navigation is the state change.
 */
export async function TrackFilterChips({
  basePath,
  current,
  options,
}: {
  /** Unlocalized app path of the list page, e.g. "/reading". */
  basePath: string;
  current: TrackFilter | ExamTrackFilter;
  options: readonly (TrackFilter | ExamTrackFilter)[];
}) {
  const t = await getDict();

  return (
    <nav aria-label={t.filters.byTrack} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === current;
        return (
          <Link
            key={option}
            href={`${basePath}?track=${option}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              // Same pill as ui/chip, as a link: the filter is the URL.
              "inline-flex min-h-10 items-center rounded-full border-[1.5px] px-4 py-1.5 text-sm font-medium whitespace-nowrap outline-hidden transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-brand bg-brand-soft text-brand-ink"
                : "border-input bg-card text-foreground hover:bg-muted",
            )}
          >
            {option === "all" ? t.filters.all : t.tracks[option]}
          </Link>
        );
      })}
    </nav>
  );
}
