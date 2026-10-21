import {
  BookMarked,
  BookOpenText,
  Clock3,
  Headphones,
  LibraryBig,
  Mic,
  NotebookPen,
  PenLine,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { planItemTitle } from "@/components/plan/plan-labels";
import { RouteNode } from "@/components/plan/RouteNode";
import { stopNote } from "@/components/plan/stop-note";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { PlanItemKind } from "@/lib/plan-core";
import type { PlanStop } from "@/lib/plan-status-core";
import { cn } from "@/lib/utils";
import { SkippedStopLink, StopActions } from "./StopActions";

const KIND_ICONS: Record<PlanItemKind, LucideIcon> = {
  vocab_review: BookMarked,
  vocab_new: Sparkles,
  mistakes: NotebookPen,
  book_chapter: LibraryBig,
  reading: BookOpenText,
  listening: Headphones,
  writing: PenLine,
  speaking: Mic,
  mock_exam: Timer,
};

/**
 * Today as a route of stops. Only the current stop is a raised card with a
 * primary action; done stops collapse to a checked row with what was
 * achieved; the rest are quiet rows you can still open.
 */
export function TodayRoute({
  t,
  day,
  stops,
  titles,
}: {
  t: Dictionary;
  day: string;
  stops: PlanStop[];
  titles: Map<string, string>;
}) {
  return (
    <ol className="flex flex-col">
      {stops.map((stop, i) => {
        const current = stop.status === "current";
        const last = i === stops.length - 1;
        const muted = stop.status === "done" || stop.status === "skipped";
        const title = planItemTitle(t, stop.kind);
        const sub = titles.get(stop.key);
        const Icon = KIND_ICONS[stop.kind];
        return (
          <li key={stop.key} className="flex gap-4" aria-current={current ? "step" : undefined}>
            <div className="flex w-7 shrink-0 flex-col items-center">
              <RouteNode
                status={stop.status}
                number={i + 1}
                className={current ? "mt-[1.375rem]" : undefined}
              />
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    "my-1 min-h-[1.125rem] w-0.5 flex-1 rounded-full transition-colors duration-300",
                    stop.status === "done" ? "bg-brand" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div className={cn("min-w-0 flex-1", last ? "" : current ? "pb-5" : "pb-[1.375rem]")}>
              {current ? (
                <div className="rounded-xl border border-border bg-card px-[1.375rem] py-5 shadow-raised">
                  <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-brand-ink">
                    <span aria-hidden className="size-[7px] rounded-full bg-brand" />
                    {t.today.upNext}
                  </p>
                  <div className="mt-3.5 flex items-start gap-3.5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon className="size-[1.3125rem]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-serif text-[1.4375rem] leading-snug font-medium">
                        {title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{stopNote(t, stop)}</p>
                      {sub ? (
                        <p className="mt-2 font-serif text-base leading-snug text-soft-3 italic">
                          {sub}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-[1.125rem] flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
                      <Clock3 className="size-[0.9375rem]" aria-hidden />
                      <span>
                        {stop.estMinutes} {t.plan.minutesUnit}
                      </span>
                      <span className="hidden md:inline">· {t.today.enter}</span>
                    </span>
                    <StopActions
                      day={day}
                      stopKey={stop.key}
                      stopNumber={i + 1}
                      href={stop.href}
                      startLabel={stop.started ? t.today.resume : t.today.start}
                    />
                  </div>
                </div>
              ) : (
                <RowLink day={day} stop={stop}>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-base leading-normal font-medium",
                        muted ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {title}
                    </p>
                    <p className="mt-px text-[0.8125rem] text-muted-foreground">
                      {stopNote(t, stop)}
                      {sub && !muted ? ` · ${sub}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.8125rem] leading-6 text-muted-foreground tabular-nums">
                    {stop.estMinutes} {t.plan.minutesUnit}
                  </span>
                </RowLink>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const ROW =
  "-mx-2 flex items-start gap-3 rounded-md px-2 py-1 outline-hidden transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

function RowLink({
  day,
  stop,
  children,
}: {
  day: string;
  stop: PlanStop;
  children: React.ReactNode;
}) {
  if (stop.status === "skipped") {
    return (
      <SkippedStopLink day={day} stopKey={stop.key} href={stop.href} className={ROW}>
        {children}
      </SkippedStopLink>
    );
  }
  return (
    <Link href={stop.href} className={ROW}>
      {children}
    </Link>
  );
}
