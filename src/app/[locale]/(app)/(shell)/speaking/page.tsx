import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { TrackFilterChips } from "@/components/layout/TrackFilterChips";
import { RowStatus, ViewAllLink } from "@/components/practice/HubParts";
import { Badge } from "@/components/ui/badge";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { listSpeakingPrompts } from "@/lib/queries/speaking";
import { requireOnboarded } from "@/lib/settings";
import { parseTrackFilter, TRACK_FILTER_OPTIONS } from "@/lib/track-filter";

export default async function SpeakingListPage({
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

  const { prompts, submissionCountByPrompt: countByPrompt } = await listSpeakingPrompts(
    user.id,
    track,
  );

  return (
    <div className="flex flex-col gap-8">
      <EntryHeader
        title={t.nav.speaking}
        ipa={t.entry.speakingIpa}
        pos={t.entry.speakingPos}
        gloss={t.speaking.subtitle}
      />

      <TrackFilterChips basePath="/speaking" current={filter} options={TRACK_FILTER_OPTIONS} />

      <EntryList>
        {prompts.map((p) => {
          const count = countByPrompt.get(p.id) ?? 0;
          return (
            <EntryRow
              key={p.id}
              href={`/speaking/${p.id}`}
              meta={
                <>
                  {filter === "all" ? <Badge variant="accent">{t.tracks[p.track]}</Badge> : null}
                  <Badge>{t.speakingParts[p.partType]}</Badge>
                </>
              }
              title={p.title}
              subtitle={`${p.titleZh} · ${
                p.prepSeconds > 0
                  ? fill(t.speaking.meta, { p: p.prepSeconds, s: p.speakSeconds })
                  : fill(t.speaking.metaNoPrep, { s: p.speakSeconds })
              }`}
              right={
                <RowStatus done={count > 0}>
                  {count > 0
                    ? fill(t.speaking.submittedCount, { n: count })
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
              <ViewAllLink href="/speaking?track=all">{t.filters.viewAll}</ViewAllLink>
            ) : undefined
          }
        >
          {t.common.empty}
        </EmptyState>
      ) : null}
    </div>
  );
}
