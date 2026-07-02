import { Check } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { speakingPrompts, speakingSubmissions } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function SpeakingListPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [prompts, submissions] = await Promise.all([
    db.query.speakingPrompts.findMany({
      where: eq(speakingPrompts.track, track),
      orderBy: speakingPrompts.id,
    }),
    db.query.speakingSubmissions.findMany({
      where: eq(speakingSubmissions.userId, user.id),
      orderBy: desc(speakingSubmissions.createdAt),
    }),
  ]);

  const countByPrompt = new Map<string, number>();
  for (const s of submissions) {
    countByPrompt.set(s.promptId, (countByPrompt.get(s.promptId) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.speaking}
        ipa={t.entry.speakingIpa}
        pos={t.entry.speakingPos}
        gloss={t.speaking.subtitle}
      />

      <EntryList>
        {prompts.map((p) => {
          const count = countByPrompt.get(p.id) ?? 0;
          return (
            <EntryRow
              key={p.id}
              href={`/speaking/${p.id}`}
              meta={<Badge variant="outline">{p.partType.replace(/_/g, " ")}</Badge>}
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
                      {t.writing.pastSubmissions}: {count}
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
