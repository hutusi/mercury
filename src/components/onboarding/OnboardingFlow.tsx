"use client";

import { useState, useTransition } from "react";
import { Briefcase, Check, GraduationCap, Target, type LucideIcon } from "lucide-react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Track } from "@/content/types";
import { completeOnboarding } from "@/lib/actions/settings";
import { useT } from "@/lib/i18n/LocaleProvider";
import { SELF_RATED_LEVELS, type SelfRatedLevel } from "@/lib/learner-model-core";

/** IELTS values are band×10 (65 = 6.5) — the learner_profiles encoding. */
const TARGET_OPTIONS: Record<"toeic" | "ielts", { value: number; label: string }[]> = {
  toeic: [600, 700, 800, 900].map((value) => ({ value, label: String(value) })),
  ielts: [55, 60, 65, 70, 75].map((value) => ({ value, label: (value / 10).toFixed(1) })),
};

const MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60];

function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active ? "border-foreground" : "border-border hover:border-input"
      } ${className}`}
    >
      {children}
    </button>
  );
}

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

  const levelLabels: Record<SelfRatedLevel, string> = {
    novice: t.onboarding.levelNovice,
    elementary: t.onboarding.levelElementary,
    intermediate: t.onboarding.levelIntermediate,
    upper: t.onboarding.levelUpper,
    advanced: t.onboarding.levelAdvanced,
  };

  const isExamTrack = selected === "toeic" || selected === "ielts";

  function submit(withGoal: boolean) {
    if (!selected) return;
    startTransition(async () => {
      await completeOnboarding({
        track: selected,
        goal: withGoal
          ? {
              targetScore,
              examDate: examDate || null,
              dailyMinutes,
              selfRatedLevel: level,
            }
          : undefined,
      });
    });
  }

  if (step === "track") {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {trackOptions.map((o) => {
            const active = selected === o.track;
            return (
              <button
                key={o.track}
                onClick={() => {
                  setSelected(o.track);
                  setTargetScore(null);
                  setExamDate("");
                }}
                aria-pressed={active}
                className={`border p-6 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active ? "border-foreground" : "border-border hover:border-input"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <o.icon className="size-5" aria-hidden />
                  <span className="flex items-center gap-2">
                    {active && <Check className="size-4 text-cinnabar" aria-hidden />}
                    <Badge variant={o.accent ? "accent" : "outline"}>{o.badge}</Badge>
                  </span>
                </div>
                <h2 className="mt-4 font-serif text-lg font-medium">{o.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
              </button>
            );
          })}
        </div>
        <div>
          <Button
            onClick={() => setStep("goal")}
            disabled={!selected}
            size="lg"
            className="h-11 px-8 text-base"
          >
            {t.onboarding.next}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-lg font-medium">{t.onboarding.goalTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.goalSubtitle}</p>
      </div>

      {isExamTrack && selected !== null && (
        <div>
          <SectionLabel as="h3" className="mb-3">
            {t.onboarding.targetScoreLabel}
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Chip active={targetScore === null} onClick={() => setTargetScore(null)}>
              {t.onboarding.noTarget}
            </Chip>
            {TARGET_OPTIONS[selected as "toeic" | "ielts"].map((o) => (
              <Chip
                key={o.value}
                active={targetScore === o.value}
                onClick={() => setTargetScore(o.value)}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {isExamTrack && (
        <div>
          <SectionLabel as="h3" className="mb-3">
            {t.onboarding.examDateLabel}
          </SectionLabel>
          <Input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="max-w-48"
          />
        </div>
      )}

      <div>
        <SectionLabel as="h3" className="mb-3">
          {t.onboarding.dailyMinutesLabel}
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          {MINUTE_OPTIONS.map((m) => (
            <Chip key={m} active={dailyMinutes === m} onClick={() => setDailyMinutes(m)}>
              {m} {t.onboarding.minutesUnit}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel as="h3" className="mb-3">
          {t.onboarding.levelLabel}
        </SectionLabel>
        <div className="flex max-w-md flex-col gap-2">
          {SELF_RATED_LEVELS.map((l) => (
            <Chip
              key={l}
              active={level === l}
              onClick={() => setLevel(level === l ? null : l)}
              className="text-left"
            >
              {levelLabels[l]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" onClick={() => setStep("track")} disabled={pending}>
          {t.onboarding.back}
        </Button>
        <Button
          onClick={() => submit(true)}
          disabled={pending}
          size="lg"
          className="h-11 px-8 text-base"
        >
          {pending ? t.common.loading : t.onboarding.confirm}
        </Button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t.onboarding.skipGoal}
        </button>
      </div>
    </div>
  );
}
