import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { ReadingRunner } from "@/components/reading/ReadingRunner";
import { getDict } from "@/lib/i18n";
import { getReadingExerciseSanitized, listReadingExercises } from "@/lib/queries/reading";
import { requireOnboarded } from "@/lib/settings";

export default async function ReadingExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const [{ user, goalTrack, timeZone }, { exerciseId }, t] = await Promise.all([
    requireOnboarded(),
    params,
    getDict(),
  ]);

  // The query strips answers — nothing here can leak the key while answering.
  // The sibling list (it drives the result screen's "next exercise") is
  // fetched speculatively for the goal track in the same wave; only an
  // off-goal exercise pays a second round-trip.
  const [exercise, goalSiblings, flow] = await Promise.all([
    getReadingExerciseSanitized(exerciseId),
    listReadingExercises(user.id, goalTrack),
    getFlowContext(user.id, timeZone, "reading", exerciseId),
  ]);
  if (!exercise) notFound();
  const { exercises, bestByExercise } =
    exercise.track === goalTrack
      ? goalSiblings
      : await listReadingExercises(user.id, exercise.track);
  const next = exercises.find((e) => e.id !== exercise.id && !bestByExercise.has(e.id));

  return (
    <>
      <FlowHeader context={flow} hubHref="/reading" />
      <FlowBody>
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight">{exercise.title}</h1>
            <p className="text-muted-foreground">
              {exercise.titleZh} · {exercise.genre} · {t.reading.suggestedTime}{" "}
              {exercise.suggestedMinutes} {t.common.minutes}
            </p>
          </div>
          <ReadingRunner
            exerciseId={exercise.id}
            passage={exercise.passage}
            questions={exercise.questions}
            crossPromo={<CrossPromoCard track={goalTrack} />}
            nextHref={next ? `/reading/${next.id}` : null}
          />
        </div>
      </FlowBody>
    </>
  );
}
