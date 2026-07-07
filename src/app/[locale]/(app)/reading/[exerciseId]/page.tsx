import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { ReadingRunner } from "@/components/reading/ReadingRunner";
import { getDict } from "@/lib/i18n";
import { getReadingExerciseSanitized } from "@/lib/queries/reading";
import { requireTrack } from "@/lib/settings";

export default async function ReadingExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { track } = await requireTrack();
  const { exerciseId } = await params;
  const t = await getDict();

  // The query strips answers — nothing here can leak the key while answering.
  const exercise = await getReadingExerciseSanitized(exerciseId);
  if (!exercise) notFound();

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
        questions={exercise.questions}
        crossPromo={<CrossPromoCard track={track} />}
      />
    </div>
  );
}
