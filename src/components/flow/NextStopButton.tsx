import { ArrowRight } from "lucide-react";
import { planItemTitle } from "@/components/plan/plan-labels";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { FlowContext } from "@/lib/queries/plan";

/**
 * Every result names the next stop. In plan mode: "下一站：阅读练习 · 8 分钟 →"
 * (or back to Today once the route is done). Off-plan it renders nothing —
 * the result screen keeps its own way back.
 */
export async function NextStopButton({
  context,
  className,
}: {
  context: FlowContext;
  className?: string;
}) {
  if (context.mode !== "plan") return null;
  const t = await getDict();
  const next = context.next;
  return (
    <Button asChild size="lg" className={className}>
      {next ? (
        <Link href={next.href}>
          <span>
            {fill(t.flow.nextStop, { title: planItemTitle(t, next.kind), m: next.estMinutes })}
          </span>
          <ArrowRight aria-hidden />
        </Link>
      ) : (
        <Link href="/dashboard">{t.flow.backToday}</Link>
      )}
    </Button>
  );
}
