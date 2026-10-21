import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { TrackFilterChips } from "@/components/layout/TrackFilterChips";
import { RowStatus, ViewAllLink } from "@/components/practice/HubParts";
import { Badge } from "@/components/ui/badge";
import { getDict } from "@/lib/i18n";
import { listListeningExercises } from "@/lib/queries/listening";
import { requireOnboarded } from "@/lib/settings";
import { parseTrackFilter, TRACK_FILTER_OPTIONS } from "@/lib/track-filter";

export default async function ListeningListPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const [{ user, goalTrack }, t, { track: trackParam }] = await Promise.all([
    requireOnboarded(),
    getDict(),
    searchParams,
  ]);
  const { filter, track } = parseTrackFilter(trackParam, goalTrack);

  const { exercises, bestByExercise } = await listListeningExercises(user.id, track);

  return (
    <div className="flex flex-col gap-8">
      <EntryHeader
        title={t.nav.listening}
        ipa={t.entry.listeningIpa}
        pos={t.entry.listeningPos}
        gloss={t.listening.subtitle}
      />

      <TrackFilterChips basePath="/listening" current={filter} options={TRACK_FILTER_OPTIONS} />

      <EntryList>
        {exercises.map((ex) => {
          const best = bestByExercise.get(ex.id);
          return (
            <EntryRow
              key={ex.id}
              href={`/listening/${ex.id}`}
              meta={
                <>
                  {filter === "all" ? <Badge variant="accent">{t.tracks[ex.track]}</Badge> : null}
                  <Badge>{ex.style}</Badge>
                </>
              }
              title={ex.title}
              subtitle={`${ex.titleZh} · ${ex.questionCount} ${t.common.questions}`}
              right={
                <RowStatus done={Boolean(best)}>
                  {best
                    ? `${t.reading.bestScore} ${best.score}/${best.total}`
                    : t.reading.notAttempted}
                </RowStatus>
              }
            />
          );
        })}
      </EntryList>
      {exercises.length === 0 ? (
        <EmptyState
          action={
            filter !== "all" ? (
              <ViewAllLink href="/listening?track=all">{t.filters.viewAll}</ViewAllLink>
            ) : undefined
          }
        >
          {t.common.empty}
        </EmptyState>
      ) : null}
    </div>
  );
}
