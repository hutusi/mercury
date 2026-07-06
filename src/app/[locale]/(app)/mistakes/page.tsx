import { EntryHeader } from "@/components/typography/EntryHeader";
import { MistakesView } from "@/components/mistakes/MistakesView";
import { getDict } from "@/lib/i18n";
import { getMistakesPageData } from "@/lib/mistakes";
import { requireTrack } from "@/lib/settings";

export default async function MistakesPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();
  const { active, cleared, counts } = await getMistakesPageData(user.id, track);

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.mistakes}
        ipa={t.entry.mistakesIpa}
        pos={t.entry.mistakesPos}
        gloss={t.mistakes.subtitle}
      />
      <MistakesView active={active} cleared={cleared} counts={counts} />
    </div>
  );
}
