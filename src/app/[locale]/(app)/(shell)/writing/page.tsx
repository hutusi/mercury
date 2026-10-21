import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { TrackFilterChips } from "@/components/layout/TrackFilterChips";
import { RowStatus, ViewAllLink } from "@/components/practice/HubParts";
import { Badge } from "@/components/ui/badge";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { listWritingPrompts } from "@/lib/queries/writing";
import { requireOnboarded } from "@/lib/settings";
import { parseTrackFilter, TRACK_FILTER_OPTIONS } from "@/lib/track-filter";

export default async function WritingListPage({
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

  const { prompts, submissionCountByPrompt: submissionsByPrompt } = await listWritingPrompts(
    user.id,
    track,
  );

  return (
    <div className="flex flex-col gap-8">
      <EntryHeader
        title={t.nav.writing}
        ipa={t.entry.writingIpa}
        pos={t.entry.writingPos}
        gloss={t.writing.subtitle}
      />

      <TrackFilterChips basePath="/writing" current={filter} options={TRACK_FILTER_OPTIONS} />

      <EntryList>
        {prompts.map((p) => {
          const count = submissionsByPrompt.get(p.id) ?? 0;
          return (
            <EntryRow
              key={p.id}
              href={`/writing/${p.id}`}
              meta={
                <>
                  {filter === "all" ? <Badge variant="accent">{t.tracks[p.track]}</Badge> : null}
                  <Badge>{t.writingTasks[p.taskType]}</Badge>
                </>
              }
              title={p.title}
              subtitle={`${p.titleZh} · ${fill(t.writing.meta, { n: p.minWords, m: p.suggestedMinutes })}`}
              right={
                <RowStatus done={count > 0}>
                  {count > 0
                    ? fill(t.writing.submittedCount, { n: count })
                    : t.reading.notAttempted}
                </RowStatus>
              }
            />
          );
        })}
      </EntryList>
      {prompts.length === 0 ? (
        <EmptyState
          action={
            filter !== "all" ? (
              <ViewAllLink href="/writing?track=all">{t.filters.viewAll}</ViewAllLink>
            ) : undefined
          }
        >
          {t.common.empty}
        </EmptyState>
      ) : null}
    </div>
  );
}
