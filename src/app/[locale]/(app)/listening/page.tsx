import { Check } from "lucide-react";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { TrackFilterChips } from "@/components/layout/TrackFilterChips";
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
  const { user, goalTrack } = await requireOnboarded();
  const t = await getDict();

  const { filter, track } = parseTrackFilter((await searchParams).track, goalTrack);

  const { exercises, bestByExercise } = await listListeningExercises(user.id, track);

  return (
    <div className="space-y-8">
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
              meta={<Badge variant="outline">{ex.style}</Badge>}
              title={ex.title}
              subtitle={ex.titleZh}
              right={
                <div className="text-right">
                  <p className="font-mono text-2xs text-muted-foreground">
                    {ex.questions.length} {t.common.questions}
                  </p>
                  {best ? (
                    <p className="mt-1 flex items-center justify-end gap-1 font-mono text-xs font-medium text-foreground tabular-nums">
                      <Check className="size-3.5" aria-hidden />
                      {t.reading.bestScore}: {best.score}/{best.total}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {t.reading.notAttempted}
                    </p>
                  )}
                </div>
              }
            />
          );
        })}
      </EntryList>
      {exercises.length === 0 && <EmptyState>{t.common.empty}</EmptyState>}
    </div>
  );
}
