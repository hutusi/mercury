import { MistakesView, type MistakesGoal } from "@/components/mistakes/MistakesView";
import { planItemTitle } from "@/components/plan/plan-labels";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { getMistakesPageData } from "@/lib/mistakes";
import { getFlowContext, type FlowContext } from "@/lib/queries/plan";
import { requireOnboarded } from "@/lib/settings";

export default async function MistakesPage() {
  const [{ user, timeZone }, t] = await Promise.all([requireOnboarded(), getDict()]);
  // Personal collection — never track-filtered (ADR 0029).
  const [{ active, cleared, counts }, flow] = await Promise.all([
    getMistakesPageData(user.id, null),
    getFlowContext(user.id, timeZone, "mistakes"),
  ]);

  return (
    <div className="mx-auto flex max-w-[53.75rem] flex-col gap-6">
      <EntryHeader
        title={t.nav.mistakes}
        ipa={t.entry.mistakesIpa}
        pos={t.entry.mistakesPos}
        gloss={t.mistakes.subtitle}
      />
      <MistakesView
        active={active}
        cleared={cleared}
        counts={counts}
        timeZone={timeZone}
        // eslint-disable-next-line react-hooks/purity -- one request-time clock for SSR and hydration ("today", "just now")
        now={Date.now()}
        goal={goalFor(flow, t)}
      />
    </div>
  );
}

/** Today's mistakes stop, if the plan has one with a count to reach. */
function goalFor(flow: FlowContext, t: Awaited<ReturnType<typeof getDict>>): MistakesGoal | null {
  if (flow.mode !== "plan" || flow.stop.progress?.type !== "count") return null;
  const { done, target } = flow.stop.progress;
  if (target <= 0) return null;
  return {
    index: flow.index + 1,
    target,
    done,
    next: flow.next
      ? {
          href: flow.next.href,
          label: fill(t.flow.nextShort, { title: planItemTitle(t, flow.next.kind) }),
        }
      : { href: "/dashboard", label: t.flow.backToday },
  };
}
