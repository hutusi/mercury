import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { NextStopButton } from "@/components/flow/NextStopButton";
import { ReadingRunner } from "@/components/reading/ReadingRunner";
import { getReadingExerciseSanitized, listReadingExercises } from "@/lib/queries/reading";
import { getReviewedGlossesToday } from "@/lib/queries/vocab";
import { requireOnboarded } from "@/lib/settings";

export default async function ReadingExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const [{ user, goalTrack, timeZone }, { exerciseId }] = await Promise.all([
    requireOnboarded(),
    params,
  ]);

  // The query strips answers — nothing here can leak the key while answering.
  // The sibling list (it drives the result screen's "next exercise") is
  // fetched speculatively for the goal track in the same wave; only an
  // off-goal exercise pays a second round-trip.
  const [exercise, goalSiblings, flow, glosses] = await Promise.all([
    getReadingExerciseSanitized(exerciseId),
    listReadingExercises(user.id, goalTrack),
    getFlowContext(user.id, timeZone, "reading", exerciseId),
    getReviewedGlossesToday(user.id, timeZone),
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
      <FlowBody width="wide">
        <ReadingRunner
          exerciseId={exercise.id}
          title={exercise.title}
          titleZh={exercise.titleZh}
          genre={exercise.genre}
          suggestedMinutes={exercise.suggestedMinutes}
          passage={exercise.passage}
          questions={exercise.questions}
          glosses={glosses}
          // An element is truthy even when it renders nothing, so off-plan
          // passes none and the result falls back to "next exercise".
          nextStop={
            flow.mode === "plan" ? <NextStopButton context={flow} className="w-full" /> : null
          }
          nextHref={next ? `/reading/${next.id}` : null}
          crossPromo={<CrossPromoCard track={goalTrack} />}
        />
      </FlowBody>
    </>
  );
}
