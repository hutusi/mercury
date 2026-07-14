import { Skeleton } from "@/components/ui/skeleton";
import type { DailyPlan } from "@/lib/queries/plan";
import { TodayPlanCard } from "./TodayPlanCard";

/**
 * 今日计划 is the heaviest fan-out on the dashboard (~16 content-list queries).
 * It streams inside its own Suspense boundary so the rest of the dashboard
 * paints from the lighter summary batch. The page starts the query *before*
 * awaiting the summary and passes the in-flight promise here, so the two
 * batches run concurrently (total ≈ max(summary, plan), not summary + plan).
 */
export async function DailyPlanSection({ plan }: { plan: Promise<DailyPlan> }) {
  const resolved = await plan;
  return <TodayPlanCard items={resolved.items} />;
}

/** Suspense fallback shaped like the plan card so the layout doesn't jump. */
export function DailyPlanSkeleton() {
  return (
    <section aria-hidden>
      <div className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="h-4 w-5" />
            <Skeleton className="size-4" />
            <Skeleton className="h-4 max-w-40 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </section>
  );
}
