import { BookOpenText } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { and, eq } from "drizzle-orm";
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
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span
            className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <BookOpenText className="size-5" />
          </span>
          {t.nav.reading}
        </h1>
        <p className="mt-1 text-muted-foreground">{t.reading.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {exercises.map((ex) => {
          const best = bestByExercise.get(ex.id);
          return (
            <Link
              key={ex.id}
              href={`/reading/${ex.id}`}
              className="group rounded-xl border bg-card p-5 shadow-xs transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {ex.genre}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {ex.questions.length} {t.common.questions} · {ex.suggestedMinutes}{" "}
                  {t.common.minutes}
                </span>
              </div>
              <h2 className="mt-3 font-semibold group-hover:text-primary">{ex.title}</h2>
              <p className="text-sm text-muted-foreground">{ex.titleZh}</p>
              <p className="mt-3 text-xs font-medium">
                {best ? (
                  <span className="text-green-600 dark:text-green-400">
                    {t.reading.bestScore}: {best.score}/{best.total}
                  </span>
                ) : (
                  <span className="text-muted-foreground/70">{t.reading.notAttempted}</span>
                )}
              </p>
            </Link>
          );
        })}
      </div>
      {exercises.length === 0 && <p className="text-muted-foreground">{t.common.empty}</p>}
    </div>
  );
}
