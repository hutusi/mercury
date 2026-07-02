import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { ListeningRunner } from "@/components/listening/ListeningRunner";
import { db } from "@/lib/db";
import { listeningExercises } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function ListeningExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { track } = await requireTrack();
  const { exerciseId } = await params;
  const t = await getDict();

  const exercise = await db.query.listeningExercises.findFirst({
    where: eq(listeningExercises.id, exerciseId),
  });
  if (!exercise) notFound();

  const sanitized = exercise.questions.map(({ id, stem, options }) => ({ id, stem, options }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/listening"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.reading.backToList}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{exercise.title}</h1>
        <p className="text-muted-foreground">
          {exercise.titleZh} · {exercise.style}
        </p>
      </div>
      <ListeningRunner
        exerciseId={exercise.id}
        script={exercise.script}
        questions={sanitized}
        crossPromo={<CrossPromoCard track={track} />}
      />
    </div>
  );
}
