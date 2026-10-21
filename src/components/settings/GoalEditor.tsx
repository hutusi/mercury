"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GoalFields } from "@/components/onboarding/GoalFields";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { TRACKS, type Track } from "@/content/tracks";
import { updateLearnerProfile } from "@/lib/actions/profile";
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

  // Any edit invalidates the last save/error indicator.
  function edit(apply: () => void) {
    apply();
    setSaved(false);
    setFailed(false);
  }

  function pickTrack(next: Track) {
    if (next === track) return;
    edit(() => {
      setTrack(next);
      // Score scales differ per exam (and business has none) — never carry one over.
      setTargetScore(null);
    });
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
    <div className="flex flex-col gap-7">
      <div>
        <p className="mb-2.5 text-[0.9375rem] font-semibold">{t.settings.trackLabel}</p>
        <div className="flex flex-wrap gap-2">
          {TRACKS.map((option) => (
            <Chip key={option} active={track === option} onClick={() => pickTrack(option)}>
              {t.tracks[option]}
            </Chip>
          ))}
        </div>
      </div>

      <GoalFields
        track={track}
        targetScore={targetScore}
        onTargetScore={(v) => edit(() => setTargetScore(v))}
        examDate={examDate}
        onExamDate={(v) => edit(() => setExamDate(v))}
        dailyMinutes={dailyMinutes}
        onDailyMinutes={(v) => edit(() => setDailyMinutes(v))}
      />

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? t.settings.saving : t.settings.save}
        </Button>
        {saved && !pending ? (
          <span className="text-sm text-brand-ink" role="status">
            {t.settings.saved}
          </span>
        ) : null}
        {failed && !pending ? (
          <span className="text-sm text-destructive" role="status">
            {t.auth.genericError}
          </span>
        ) : null}
      </div>
    </div>
  );
}
