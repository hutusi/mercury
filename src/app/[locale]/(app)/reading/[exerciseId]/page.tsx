import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { ReadingRunner } from "@/components/reading/ReadingRunner";
import { db } from "@/lib/db";
import { readingExercises } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function ReadingExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { track } = await requireTrack();
  const { exerciseId } = await params;
  const t = await getDict();

  const exercise = await db.query.readingExercises.findFirst({
    where: eq(readingExercises.id, exerciseId),
  });
  if (!exercise) notFound();

  // Never ship answers to the client while answering.
  const sanitized = exercise.questions.map(({ id, stem, options }) => ({ id, stem, options }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reading" className="text-sm font-medium text-brand-600 hover:underline">
          ← {t.reading.backToList}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{exercise.title}</h1>
        <p className="text-slate-500">
          {exercise.titleZh} · {exercise.genre} · {t.reading.suggestedTime}{" "}
          {exercise.suggestedMinutes} {t.common.minutes}
        </p>
      </div>
      <ReadingRunner
        exerciseId={exercise.id}
        passage={exercise.passage}
        questions={sanitized}
        crossPromo={<CrossPromoCard track={track} />}
      />
    </div>
  );
}
