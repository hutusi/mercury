import { Check } from "lucide-react";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { TrackFilterChips } from "@/components/layout/TrackFilterChips";
import { Badge } from "@/components/ui/badge";
import { getDict } from "@/lib/i18n";
import { listSpeakingPrompts } from "@/lib/queries/speaking";
import { requireOnboarded } from "@/lib/settings";
import { parseTrackFilter, TRACK_FILTER_OPTIONS } from "@/lib/track-filter";

export default async function SpeakingListPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { user, goalTrack } = await requireOnboarded();
  const t = await getDict();

  const { filter, track } = parseTrackFilter((await searchParams).track, goalTrack);

  const { prompts, submissionCountByPrompt: countByPrompt } = await listSpeakingPrompts(
    user.id,
    track,
  );

  return (
    <div className="space-y-8">
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
                  {filter === "all" && <Badge variant="outline">{t.tracks[p.track]}</Badge>}
                  <Badge variant="outline">{p.partType.replace(/_/g, " ")}</Badge>
                </>
              }
              title={p.title}
              subtitle={p.titleZh}
              right={
                <div className="text-right">
                  <p className="font-mono text-2xs text-muted-foreground">
                    {p.prepSeconds > 0 &&
                      `${t.speaking.prep} ${p.prepSeconds}${t.common.seconds} · `}
                    {t.speaking.speak} {p.speakSeconds}
                    {t.common.seconds}
                  </p>
                  {count > 0 && (
                    <p className="mt-1 flex items-center justify-end gap-1 font-mono text-xs font-medium text-foreground tabular-nums">
                      <Check className="size-3.5" aria-hidden />
                      {t.speaking.pastSubmissions}: {count}
                    </p>
                  )}
                </div>
              }
            />
          );
        })}
      </EntryList>
      {prompts.length === 0 && <EmptyState>{t.common.empty}</EmptyState>}
    </div>
  );
}
