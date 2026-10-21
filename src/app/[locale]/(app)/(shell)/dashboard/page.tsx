import { Check } from "lucide-react";
import { SegmentedProgress } from "@/components/ui/segmented-progress";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { EnterToStart } from "@/components/today/StopActions";
import { CoachMemoCard, ExamCountdownCard, StreakCard } from "@/components/today/TodayCards";
import { TodayRoute } from "@/components/today/TodayRoute";
import { getSession } from "@/lib/auth/session";
import { getDict, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getTodayPageData } from "@/lib/queries/today";
import { reminderState } from "@/lib/reminders-core";
import { requireOnboarded } from "@/lib/settings";
import { calendarDay } from "@/lib/streak-core";

/** Greeting by the learner's local hour. */
function greetingKey(hour: number) {
  if (hour >= 5 && hour < 11) return "greetMorning" as const;
  if (hour >= 11 && hour < 13) return "greetNoon" as const;
  if (hour >= 13 && hour < 18) return "greetAfternoon" as const;
  return "greetEvening" as const;
}

/**
 * Today (今日): one obvious next action. The day is a route of stops; the
 * streak, exam countdown and the coach's note sit in the margin on desktop
 * and below the route on phones.
 */
export default async function TodayPage() {
  const { user, goalTrack, timeZone, remindersEnabled } = await requireOnboarded();
  const [t, locale, data, session] = await Promise.all([
    getDict(),
    getLocale(),
    getTodayPageData(user.id, goalTrack, timeZone),
    getSession(),
  ]);
  const { route } = data;
  const now = new Date();
  const todayDay = calendarDay(now, timeZone);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  const dateLine =
    locale === "zh"
      ? [
          new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", timeZone }).format(now),
          new Intl.DateTimeFormat("zh-CN", { weekday: "long", timeZone }).format(now),
        ].join(" · ")
      : new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          weekday: "long",
          timeZone,
        }).format(now);
  const name = (session?.user.name || user.name || "").trim();
  const reminders = reminderState({
    days: new Set(data.week.filter((d) => d.active).map((d) => d.day)),
    dueCount: 0,
    today: todayDay,
  });
  const { summary } = route;

  return (
    <div>
      <EnterToStart />
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{dateLine}</p>
          <h1 className="mt-1.5 font-serif text-3xl leading-tight font-medium sm:text-[2.625rem]">
            {name ? fill(t.today[greetingKey(hour)], { name }) : t.nav.dashboard}
          </h1>
          {route.stops.length > 0 ? (
            <p className="mt-2 text-[0.9375rem] text-soft">
              {fill(t.today.summary, { n: route.stops.length, m: summary.totalMinutes })}
            </p>
          ) : null}
        </div>
        {route.stops.length > 0 ? (
          <div className="w-full max-w-[21.25rem] min-w-0 flex-[1_1_16rem]">
            <div className="mb-2 flex justify-between gap-3 text-[0.8125rem] text-muted-foreground">
              <span>{t.today.progressLabel}</span>
              <span className="tabular-nums">
                {summary.remainingMinutes === 0
                  ? fill(t.today.progressDone, { d: summary.done, n: summary.total })
                  : fill(t.today.progress, {
                      d: summary.done,
                      n: summary.total,
                      m: summary.remainingMinutes,
                    })}
              </span>
            </div>
            <SegmentedProgress
              label={`${summary.done} / ${summary.total}`}
              segments={route.stops.map((s) => ({ weight: s.estMinutes, tone: s.status }))}
            />
          </div>
        ) : null}
      </div>

      {data.isNewUser ? (
        <Callout variant="accent" className="mt-8 px-5 py-4">
          <h2 className="font-serif text-lg font-medium text-foreground">
            {t.dashboard.welcomeTitle}
          </h2>
          <p className="mt-1 text-sm text-pretty">{t.dashboard.welcomeBody}</p>
        </Callout>
      ) : null}

      <div className="mt-8 flex flex-wrap items-start gap-x-12 gap-y-8 sm:mt-11">
        <section className="min-w-0 flex-[999_1_27.5rem]" aria-labelledby="plan-title">
          <SectionLabel id="plan-title" as="h2" note={t.plan.subtitle} className="mb-[1.125rem]">
            {t.plan.title}
          </SectionLabel>

          {summary.allDone || route.stops.length === 0 ? (
            <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-brand-soft p-[1.375rem]">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Check className="size-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-[1_1_12.5rem]">
                <p className="font-serif text-[1.375rem] leading-snug font-medium">
                  {route.stops.length === 0 ? t.plan.emptyTitle : t.today.allDone}
                </p>
                <p className="mt-0.5 text-sm text-brand-ink-2">{t.today.allDoneHint}</p>
              </div>
              <Button asChild size="sm">
                <Link href="/vocabulary/study">{t.today.allDoneCta}</Link>
              </Button>
            </div>
          ) : null}

          <TodayRoute t={t} day={route.day} stops={route.stops} titles={data.titles} />
        </section>

        <aside className="flex min-w-0 flex-[1_1_16.25rem] flex-col gap-3.5">
          <StreakCard
            t={t}
            streak={data.streak}
            week={data.week}
            checkedIn={data.checkedIn}
            atRisk={remindersEnabled && reminders.streakAtRisk}
          />
          {data.exam ? (
            <ExamCountdownCard
              t={t}
              locale={locale}
              today={new Date(`${todayDay}T12:00:00.000Z`)}
              exam={data.exam}
            />
          ) : null}
          <CoachMemoCard t={t} memo={data.coachMemo} />
        </aside>
      </div>
    </div>
  );
}
