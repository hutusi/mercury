import { EntryHeader } from "@/components/typography/EntryHeader";
import { MistakesView } from "@/components/mistakes/MistakesView";
import { TrackFilterChips } from "@/components/layout/TrackFilterChips";
import { getDict } from "@/lib/i18n";
import { getMistakesPageData } from "@/lib/mistakes";
import { requireOnboarded } from "@/lib/settings";
import { parseTrackFilter, TRACK_FILTER_OPTIONS } from "@/lib/track-filter";

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { user, goalTrack } = await requireOnboarded();
  const t = await getDict();
  const { filter, track } = parseTrackFilter((await searchParams).track, goalTrack);
  const { active, cleared, counts } = await getMistakesPageData(user.id, track);

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.mistakes}
        ipa={t.entry.mistakesIpa}
        pos={t.entry.mistakesPos}
        gloss={t.mistakes.subtitle}
      />
      <TrackFilterChips basePath="/mistakes" current={filter} options={TRACK_FILTER_OPTIONS} />
      <MistakesView active={active} cleared={cleared} counts={counts} />
    </div>
  );
}
