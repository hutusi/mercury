import { ArrowRight } from "lucide-react";
import { SegmentedProgress } from "@/components/ui/segmented-progress";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { Track } from "@/content/types";
import { getTodayRoute } from "@/lib/queries/plan";
import { planItemTitle } from "./plan-labels";

/**
 * The sidebar's "今日计划 2 / 4" card: the route bar and a link straight to
 * the current stop. Streamed under Suspense by the shell — shares the cached
 * route computation with the Today page.
 */
export async function PlanCard({
  userId,
  track,
  timeZone,
}: {
  userId: string;
  track: Track;
  timeZone: string;
}) {
  const [t, route] = await Promise.all([getDict(), getTodayRoute(userId, track, timeZone)]);
  if (route.stops.length === 0) return null;
  const current = route.stops.find((s) => s.key === route.summary.currentKey);

  return (
    <div className="mx-1.5 rounded-lg border border-border bg-card px-3.5 py-3">
      <div className="flex items-baseline justify-between text-[0.8125rem]">
        <span className="font-semibold">{t.plan.title}</span>
        <span className="text-muted-foreground tabular-nums">
          {route.summary.done} / {route.summary.total}
        </span>
      </div>
      <SegmentedProgress
        className="mt-2.5 h-1"
        segments={route.stops.map((s) => ({ weight: s.estMinutes, tone: s.status }))}
      />
      {current ? (
        <Link
          href={current.href}
          className="mt-3 flex items-center gap-1.5 rounded-sm text-[0.8125rem] leading-snug font-medium text-brand-ink outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{fill(t.flow.nextShort, { title: planItemTitle(t, current.kind) })}</span>
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/** Same footprint while streaming, so the sidebar doesn't jump. */
export function PlanCardSkeleton() {
  return <div aria-hidden className="mx-1.5 h-[5.5rem] rounded-lg border border-border bg-card" />;
}
