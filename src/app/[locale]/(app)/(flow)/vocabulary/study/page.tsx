import { Sparkles } from "lucide-react";
import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { NextStopButton } from "@/components/flow/NextStopButton";
import { EmptyState } from "@/components/typography/EmptyState";
import { Button } from "@/components/ui/button";
import { StudySession, type StudyCardData } from "@/components/vocab/StudySession";
import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getFlowContext } from "@/lib/queries/plan";
import { getStudyQueue } from "@/lib/queries/vocab";
import { requireOnboarded } from "@/lib/settings";
import { getStreakSummary } from "@/lib/streak";

export default async function StudyPage() {
  const { user, goalTrack, timeZone } = await requireOnboarded();
  // Personal collection — due reviews always cover every track (ADR 0029):
  // a goal-track default would silently hide reviews the learner owes. New
  // words come goal-pack-first, spilling over to the other packs once the
  // goal pack is exhausted — vocabulary isn't owned by tracks.
  const [t, cards, flow, streak] = await Promise.all([
    getDict(),
    getStudyQueue(user.id, { dueTrack: null, newTrack: null, newPriorityTrack: goalTrack }),
    getFlowContext(user.id, timeZone, "vocab"),
    getStreakSummary(user.id, timeZone),
  ]);

  return (
    <>
      <FlowHeader context={flow} hubHref="/vocabulary" />
      <FlowBody width="narrow">
        <h1 className="sr-only">{t.vocab.study}</h1>
        {cards.length === 0 ? (
          <EmptyState
            action={
              <Button asChild>
                <Link href="/vocabulary/quiz">{t.vocab.startQuiz}</Link>
              </Button>
            }
          >
            <span className="flex justify-center text-brand" aria-hidden>
              <Sparkles className="size-6" />
            </span>
            <span className="mt-3 block font-serif text-xl text-foreground">
              {t.vocab.emptyTitle}
            </span>
            <span className="mt-1 block">{t.vocab.allClear}</span>
          </EmptyState>
        ) : (
          <StudySession
            cards={cards as StudyCardData[]}
            streak={streak.streak}
            checkedInToday={streak.checkedInToday}
            inPlan={flow.mode === "plan"}
            nextStop={<NextStopButton context={flow} className="w-full" />}
          />
        )}
      </FlowBody>
    </>
  );
}
