import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { ExamTrackFilter, TrackFilter } from "@/lib/track-filter";

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
            className={`border px-3 py-1.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              active
                ? "border-foreground font-medium"
                : "border-border text-muted-foreground hover:border-input hover:text-foreground"
            }`}
          >
            {option === "all" ? t.filters.all : t.tracks[option]}
          </Link>
        );
      })}
    </nav>
  );
}
