import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseAttempts, listeningExercises } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function ListeningListPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [exercises, attempts] = await Promise.all([
    db.query.listeningExercises.findMany({
      where: eq(listeningExercises.track, track),
      orderBy: listeningExercises.id,
    }),
    db.query.exerciseAttempts.findMany({
      where: and(eq(exerciseAttempts.userId, user.id), eq(exerciseAttempts.kind, "listening")),
    }),
  ]);

  const bestByExercise = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const best = bestByExercise.get(a.refId);
    if (!best || a.score > best.score) bestByExercise.set(a.refId, { score: a.score, total: a.total });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <span aria-hidden>🎧</span> {t.nav.listening}
        </h1>
        <p className="mt-1 text-slate-500">{t.listening.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {exercises.map((ex) => {
          const best = bestByExercise.get(ex.id);
          return (
            <Link
              key={ex.id}
              href={`/listening/${ex.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {ex.style}
                </span>
                <span className="text-xs text-slate-400">
                  {ex.questions.length} {t.common.questions}
                </span>
              </div>
              <h2 className="mt-3 font-semibold text-slate-900 group-hover:text-brand-700">
                {ex.title}
              </h2>
              <p className="text-sm text-slate-500">{ex.titleZh}</p>
              <p className="mt-3 text-xs font-medium">
                {best ? (
                  <span className="text-green-600">
                    {t.reading.bestScore}: {best.score}/{best.total}
                  </span>
                ) : (
                  <span className="text-slate-400">{t.reading.notAttempted}</span>
                )}
              </p>
            </Link>
          );
        })}
      </div>
      {exercises.length === 0 && <p className="text-slate-500">{t.common.empty}</p>}
    </div>
  );
}
