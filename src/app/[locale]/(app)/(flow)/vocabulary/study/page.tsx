import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { Sparkles } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { StudySession, type StudyCardData } from "@/components/vocab/StudySession";
import { getDict } from "@/lib/i18n";
import { getStudyQueue } from "@/lib/queries/vocab";
import { requireOnboarded } from "@/lib/settings";

export default async function StudyPage() {
  const { user, goalTrack, timeZone } = await requireOnboarded();
  const t = await getDict();
  const flowPromise = getFlowContext(user.id, timeZone, "vocab");

  // Personal collection — due reviews always cover every track (ADR 0029):
  // a goal-track default would silently hide reviews the learner owes. New
  // words come goal-pack-first, spilling over to the other packs once the
  // goal pack is exhausted — vocabulary isn't owned by tracks.
  const cards: StudyCardData[] = await getStudyQueue(user.id, {
    dueTrack: null,
    newTrack: null,
    newPriorityTrack: goalTrack,
  });
  const flow = await flowPromise;

  return (
    <>
      <FlowHeader context={flow} hubHref="/vocabulary" />
      <FlowBody>
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight">{t.vocab.study}</h1>
          </div>
          {cards.length === 0 ? (
            <div className="mx-auto max-w-md border border-border p-10 text-center">
              <p className="flex justify-center" aria-hidden>
                <Sparkles className="size-6" />
              </p>
              <p className="mt-4 font-medium text-foreground/80">{t.vocab.allClear}</p>
              <Link
                href="/vocabulary/quiz"
                className="mt-6 inline-block bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
              >
                {t.vocab.startQuiz}
              </Link>
            </div>
          ) : (
            <StudySession cards={cards} />
          )}
        </div>
      </FlowBody>
    </>
  );
}
