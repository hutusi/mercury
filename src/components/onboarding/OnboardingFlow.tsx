"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Briefcase, GraduationCap, Target, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { Track } from "@/content/types";
import { completeOnboarding } from "@/lib/actions/settings";
import { fill } from "@/lib/i18n/fill";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { SelfRatedLevel } from "@/lib/learner-model-core";
import { cn } from "@/lib/utils";
import { GoalFields } from "./GoalFields";

/**
 * Two local steps (track → goal + self-rating), one server action at the end
 * so an abandoned goal step never leaves a half-onboarded account.
 */
export function OnboardingFlow() {
  const t = useT();
  const [step, setStep] = useState<"track" | "goal">("track");
  const [selected, setSelected] = useState<Track | null>(null);
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [examDate, setExamDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(20);
  const [level, setLevel] = useState<SelfRatedLevel | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trackOptions: {
    track: Track;
    label: string;
    desc: string;
    badge: string;
    accent: boolean;
    icon: LucideIcon;
  }[] = [
    {
      track: "toeic",
      label: t.tracks.toeic,
      desc: t.onboarding.toeicDesc,
      badge: t.onboarding.examBadge,
      accent: false,
      icon: Target,
    },
    {
      track: "ielts",
      label: t.tracks.ielts,
      desc: t.onboarding.ieltsDesc,
      badge: t.onboarding.examBadge,
      accent: false,
      icon: GraduationCap,
    },
    {
      track: "business",
      label: t.tracks.business,
      desc: t.onboarding.businessDesc,
      badge: t.onboarding.bizBadge,
      accent: true,
      icon: Briefcase,
    },
  ];

  function submit(withGoal: boolean) {
    if (!selected) return;
    setSubmitError(null);
    startTransition(async () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      try {
        await completeOnboarding({
          track: selected,
          timeZone,
          goal: withGoal
            ? {
                targetScore,
                examDate: examDate || null,
                dailyMinutes,
                selfRatedLevel: level,
              }
            : undefined,
        });
      } catch {
        // Every user must pass this screen — its failure mode cannot be an
        // unresponsive button (success never reaches here: the action
        // redirects). Same pattern as GoalEditor.
        setSubmitError(t.auth.genericError);
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3.5">
        <div aria-hidden className="flex h-[0.3125rem] flex-1 gap-1.5">
          <span className="flex-1 rounded-full bg-brand" />
          <span
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              step === "goal" ? "bg-brand" : "bg-track",
            )}
          />
        </div>
        <span className="text-[0.8125rem] whitespace-nowrap text-muted-foreground tabular-nums">
          {fill(t.onboarding.step, { i: step === "track" ? 1 : 2 })}
        </span>
      </div>

      {step === "track" ? (
        <>
          <h1 className="mt-8 font-serif text-[1.75rem] leading-tight font-medium sm:text-[2.375rem]">
            {t.onboarding.title}
          </h1>
          <p className="mt-2 text-[0.9375rem] text-muted-foreground">{t.onboarding.subtitle}</p>
          <div className="mt-7 flex flex-col gap-3">
            {trackOptions.map((o) => {
              const active = selected === o.track;
              return (
                <button
                  key={o.track}
                  type="button"
                  onClick={() => {
                    setSelected(o.track);
                    setTargetScore(null);
                    setExamDate("");
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border-[1.5px] p-5 text-left outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-brand bg-brand-soft"
                      : "border-border bg-card hover:border-input",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      active ? "border-brand" : "border-input",
                    )}
                  >
                    {active ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <o.icon className="size-[1.125rem] text-soft-2" aria-hidden />
                      <span className="font-serif text-xl font-medium">{o.label}</span>
                      <Badge variant={o.accent ? "default" : "accent"}>{o.badge}</Badge>
                    </span>
                    <span className="mt-1 block text-sm text-soft-3">{o.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-end">
            <Button onClick={() => setStep("goal")} disabled={!selected} size="lg" className="px-8">
              {t.onboarding.next}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </>
      ) : selected ? (
        <>
          <h1 className="mt-8 font-serif text-[1.75rem] leading-tight font-medium sm:text-[2.375rem]">
            {t.onboarding.goalTitle}
          </h1>
          <p className="mt-2 text-[0.9375rem] text-muted-foreground">{t.onboarding.goalSubtitle}</p>
          <div className="mt-7">
            <GoalFields
              track={selected}
              targetScore={targetScore}
              onTargetScore={setTargetScore}
              examDate={examDate}
              onExamDate={setExamDate}
              dailyMinutes={dailyMinutes}
              onDailyMinutes={setDailyMinutes}
              level={level}
              onLevel={setLevel}
            />
          </div>
          {submitError ? (
            <Callout variant="error" className="mt-6 px-4 py-3 text-sm">
              {submitError}
            </Callout>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => setStep("track")} disabled={pending}>
              {t.onboarding.back}
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => submit(false)} disabled={pending}>
              {t.onboarding.skipGoal}
            </Button>
            <Button onClick={() => submit(true)} disabled={pending} size="lg" className="px-8">
              {pending ? t.common.loading : t.onboarding.confirm}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
