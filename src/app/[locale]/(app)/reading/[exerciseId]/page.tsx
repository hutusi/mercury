import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
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
        <Link
          href="/reading"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.reading.backToList}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{exercise.title}</h1>
        <p className="text-muted-foreground">
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
