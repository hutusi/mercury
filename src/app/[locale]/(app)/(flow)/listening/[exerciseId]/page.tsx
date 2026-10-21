import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
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
      <FlowBody>
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight">{exercise.title}</h1>
            <p className="text-muted-foreground">
              {exercise.titleZh} · {exercise.style}
            </p>
          </div>
          <ListeningRunner
            exerciseId={exercise.id}
            script={exercise.script}
            audioUrl={exercise.audioUrl}
            questions={exercise.questions}
            crossPromo={<CrossPromoCard track={goalTrack} />}
            nextHref={next ? `/listening/${next.id}` : null}
          />
        </div>
      </FlowBody>
    </>
  );
}
