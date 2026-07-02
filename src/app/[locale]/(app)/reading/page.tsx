import { Check } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { exerciseAttempts, readingExercises } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function ReadingListPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [exercises, attempts] = await Promise.all([
    db.query.readingExercises.findMany({
      where: eq(readingExercises.track, track),
      orderBy: readingExercises.id,
    }),
    db.query.exerciseAttempts.findMany({
      where: and(eq(exerciseAttempts.userId, user.id), eq(exerciseAttempts.kind, "reading")),
    }),
  ]);

  const bestByExercise = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const best = bestByExercise.get(a.refId);
    if (!best || a.score > best.score)
      bestByExercise.set(a.refId, { score: a.score, total: a.total });
  }

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.reading}
        ipa={t.entry.readingIpa}
        pos={t.entry.readingPos}
        gloss={t.reading.subtitle}
      />

      <EntryList>
        {exercises.map((ex) => {
          const best = bestByExercise.get(ex.id);
          return (
            <EntryRow
              key={ex.id}
              href={`/reading/${ex.id}`}
              meta={<Badge variant="outline">{ex.genre}</Badge>}
              title={ex.title}
              subtitle={ex.titleZh}
              right={
                <div className="text-right">
                  <p className="font-mono text-2xs text-muted-foreground">
                    {ex.questions.length} {t.common.questions} · {ex.suggestedMinutes}{" "}
                    {t.common.minutes}
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
