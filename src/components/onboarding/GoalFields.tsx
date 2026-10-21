"use client";

import { Check } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Track } from "@/content/types";
import { MINUTE_OPTIONS, TARGET_OPTIONS } from "@/lib/goal-options";
import { useT } from "@/lib/i18n/LocaleProvider";
import { SELF_RATED_LEVELS, type SelfRatedLevel } from "@/lib/learner-model-core";
import { cn } from "@/lib/utils";

/**
 * The goal form shared by onboarding's second step and the settings goal
 * editor: target score and exam date (exam tracks only), minutes per day,
 * and — in onboarding — the self-rated level.
 */
export function GoalFields({
  track,
  targetScore,
  onTargetScore,
  examDate,
  onExamDate,
  dailyMinutes,
  onDailyMinutes,
  level,
  onLevel,
}: {
  track: Track;
  targetScore: number | null;
  onTargetScore: (value: number | null) => void;
  examDate: string;
  onExamDate: (value: string) => void;
  dailyMinutes: number;
  onDailyMinutes: (value: number) => void;
  /** Omit both to hide the self-rating (settings never reseeds the model). */
  level?: SelfRatedLevel | null;
  onLevel?: (value: SelfRatedLevel | null) => void;
}) {
  const t = useT();
  const isExamTrack = track === "toeic" || track === "ielts";
  const levelLabels: Record<SelfRatedLevel, string> = {
    novice: t.onboarding.levelNovice,
    elementary: t.onboarding.levelElementary,
    intermediate: t.onboarding.levelIntermediate,
    upper: t.onboarding.levelUpper,
    advanced: t.onboarding.levelAdvanced,
  };

  return (
    <div className="flex flex-col gap-7">
      {isExamTrack ? (
        <Field label={t.onboarding.targetScoreLabel}>
          <div className="flex flex-wrap gap-2">
            {TARGET_OPTIONS[track].map((o) => (
              <Chip
                key={o.value}
                active={targetScore === o.value}
                onClick={() => onTargetScore(o.value)}
              >
                {o.label}
              </Chip>
            ))}
            <Chip active={targetScore === null} onClick={() => onTargetScore(null)}>
              {t.onboarding.noTarget}
            </Chip>
          </div>
        </Field>
      ) : null}

      {isExamTrack ? (
        <Field label={t.onboarding.examDateLabel} htmlFor="goal-exam-date">
          <Input
            id="goal-exam-date"
            type="date"
            value={examDate}
            onChange={(e) => onExamDate(e.target.value)}
            className="max-w-52"
          />
        </Field>
      ) : null}

      <Field label={t.onboarding.dailyMinutesLabel}>
        <SegmentedControl
          label={t.onboarding.dailyMinutesLabel}
          fill
          className="max-w-md"
          value={String(dailyMinutes)}
          onChange={(v) => onDailyMinutes(Number(v))}
          options={MINUTE_OPTIONS.map((m) => ({
            value: String(m),
            label: (
              <>
                {m}
                <span className="sr-only"> {t.onboarding.minutesUnit}</span>
              </>
            ),
          }))}
        />
        <p className="mt-2 text-[0.8125rem] text-muted-foreground">{t.onboarding.minutesHint}</p>
      </Field>

      {onLevel ? (
        <Field label={t.onboarding.levelLabel}>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {SELF_RATED_LEVELS.map((l) => {
              const active = level === l;
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onLevel(active ? null : l)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    active ? "bg-brand-soft" : "hover:bg-accent",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      active ? "border-brand" : "border-input",
                    )}
                  >
                    {active ? <span className="size-2 rounded-full bg-brand" /> : null}
                  </span>
                  <span className="flex-1">{levelLabels[l]}</span>
                  {active ? <Check className="size-4 text-brand" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </Field>
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="mb-2.5 block text-[0.9375rem] font-semibold">
          {label}
        </label>
      ) : (
        <p className="mb-2.5 text-[0.9375rem] font-semibold">{label}</p>
      )}
      {children}
    </div>
  );
}
