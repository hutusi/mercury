import { Check } from "lucide-react";
import { and, desc, eq } from "drizzle-orm";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { writingPrompts, writingSubmissions } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function WritingListPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [prompts, submissions] = await Promise.all([
    db.query.writingPrompts.findMany({
      where: eq(writingPrompts.track, track),
      orderBy: writingPrompts.id,
    }),
    db.query.writingSubmissions.findMany({
      where: and(eq(writingSubmissions.userId, user.id)),
      orderBy: desc(writingSubmissions.createdAt),
    }),
  ]);

  const submissionsByPrompt = new Map<string, number>();
  for (const s of submissions) {
    submissionsByPrompt.set(s.promptId, (submissionsByPrompt.get(s.promptId) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.writing}
        ipa={t.entry.writingIpa}
        pos={t.entry.writingPos}
        gloss={t.writing.subtitle}
      />

      <EntryList>
        {prompts.map((p) => {
          const count = submissionsByPrompt.get(p.id) ?? 0;
          return (
            <EntryRow
              key={p.id}
              href={`/writing/${p.id}`}
              meta={<Badge variant="outline">{p.taskType.replace(/_/g, " ")}</Badge>}
              title={p.title}
              subtitle={p.titleZh}
              right={
                <div className="text-right">
                  <p className="font-mono text-2xs text-muted-foreground">
                    {t.writing.minWords} {p.minWords} · {p.suggestedMinutes} {t.common.minutes}
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
