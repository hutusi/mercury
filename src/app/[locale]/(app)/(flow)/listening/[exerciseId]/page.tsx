import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { NextStopButton } from "@/components/flow/NextStopButton";
import { ListeningRunner } from "@/components/listening/ListeningRunner";
import { getListeningExerciseSanitized, listListeningExercises } from "@/lib/queries/listening";
import { requireOnboarded } from "@/lib/settings";

export default async function ListeningExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const [{ user, goalTrack, timeZone }, { exerciseId }] = await Promise.all([
    requireOnboarded(),
    params,
  ]);

  // The query strips answers — the script stays for client-side TTS. The
  // sibling list is fetched speculatively for the goal track in the same
  // wave (see the reading page).
  const [exercise, goalSiblings, flow] = await Promise.all([
    getListeningExerciseSanitized(exerciseId),
    listListeningExercises(user.id, goalTrack),
    getFlowContext(user.id, timeZone, "listening", exerciseId),
  ]);
  if (!exercise) notFound();
  const { exercises, bestByExercise } =
    exercise.track === goalTrack
      ? goalSiblings
      : await listListeningExercises(user.id, exercise.track);
  const next = exercises.find((e) => e.id !== exercise.id && !bestByExercise.has(e.id));

  return (
    <>
      <FlowHeader context={flow} hubHref="/listening" />
      <FlowBody width="wide">
        <ListeningRunner
          exerciseId={exercise.id}
          title={exercise.title}
          titleZh={exercise.titleZh}
          style={exercise.style}
          script={exercise.script}
          audioUrl={exercise.audioUrl}
          questions={exercise.questions}
          nextStop={
            flow.mode === "plan" ? <NextStopButton context={flow} className="w-full" /> : null
          }
          nextHref={next ? `/listening/${next.id}` : null}
          crossPromo={<CrossPromoCard track={goalTrack} />}
        />
      </FlowBody>
    </>
  );
}
