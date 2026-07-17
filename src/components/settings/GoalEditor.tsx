"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { TRACKS, type Track } from "@/content/types";
import { updateLearnerProfile } from "@/lib/actions/profile";
import { MINUTE_OPTIONS, TARGET_OPTIONS } from "@/lib/goal-options";
import { useT } from "@/lib/i18n/LocaleProvider";

export interface GoalEditorInitial {
  goalTrack: Track;
  targetScore: number | null;
  examDate: string | null;
  dailyMinutes: number;
}

/**
 * Edits the learner's goal (the only track state left after the mode switcher
 * was removed). Same pattern as ReminderToggle: the button gates on the action
 * round-trip only, and router.refresh() runs in its own non-gating transition
 * (never revalidatePath — see src/lib/actions/settings.ts).
 */
export function GoalEditor({ initial }: { initial: GoalEditorInitial }) {
  const t = useT();
  const router = useRouter();
  const [track, setTrack] = useState<Track>(initial.goalTrack);
  const [targetScore, setTargetScore] = useState<number | null>(initial.targetScore);
  const [examDate, setExamDate] = useState(initial.examDate ?? "");
  const [dailyMinutes, setDailyMinutes] = useState(initial.dailyMinutes);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  const isExamTrack = track === "toeic" || track === "ielts";

  function pickTrack(next: Track) {
    if (next === track) return;
    setTrack(next);
    // Score scales differ per exam (and business has none) — never carry one over.
    setTargetScore(null);
    setSaved(false);
  }

  async function save() {
    setPending(true);
    setSaved(false);
    setFailed(false);
    try {
      await updateLearnerProfile({
        goalTrack: track,
        targetScore: isExamTrack ? targetScore : null,
        examDate: isExamTrack && examDate ? examDate : null,
        dailyMinutes,
      });
      setSaved(true);
      startTransition(() => router.refresh());
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel as="h3" className="mb-3">
          {t.settings.trackLabel}
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          {TRACKS.map((option) => (
            <Chip key={option} active={track === option} onClick={() => pickTrack(option)}>
              {t.tracks[option]}
            </Chip>
          ))}
        </div>
      </div>

      {isExamTrack && (
        <div>
          <SectionLabel as="h3" className="mb-3">
            {t.onboarding.targetScoreLabel}
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Chip active={targetScore === null} onClick={() => setTargetScore(null)}>
              {t.onboarding.noTarget}
            </Chip>
            {TARGET_OPTIONS[track as "toeic" | "ielts"].map((o) => (
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
            aria-label={t.onboarding.examDateLabel}
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

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? t.settings.saving : t.settings.save}
        </Button>
        {saved && !pending && (
          <span className="text-sm text-muted-foreground" role="status">
            {t.settings.saved}
          </span>
        )}
        {failed && !pending && (
          <span className="text-sm text-cinnabar" role="status">
            {t.auth.genericError}
          </span>
        )}
      </div>
    </div>
  );
}
