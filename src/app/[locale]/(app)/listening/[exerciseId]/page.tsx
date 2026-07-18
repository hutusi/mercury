import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { ListeningRunner } from "@/components/listening/ListeningRunner";
import { getDict } from "@/lib/i18n";
import { getListeningExerciseSanitized } from "@/lib/queries/listening";
import { requireOnboarded } from "@/lib/settings";

export default async function ListeningExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { goalTrack } = await requireOnboarded();
  const { exerciseId } = await params;
  const t = await getDict();

  // The query strips answers — the script stays for client-side TTS.
  const exercise = await getListeningExerciseSanitized(exerciseId);
  if (!exercise) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/listening"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.reading.backToList}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{exercise.title}</h1>
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
      />
    </div>
  );
}
