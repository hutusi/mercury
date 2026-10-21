"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { abandonExamAttempt, startExamAttempt } from "@/lib/actions/exams";
import { clearExamMirror } from "@/lib/exam-mirror";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export function StartExamButton({
  examId,
  inProgressAttemptId,
}: {
  examId: string;
  inProgressAttemptId: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const [pending, startTransition] = useTransition();
  const [, startRefresh] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        await startExamAttempt(examId);
        router.push(localePath(locale, `/exams/${examId}/take`));
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  function abandon() {
    if (!inProgressAttemptId) return;
    setError(null);
    startTransition(async () => {
      try {
        await abandonExamAttempt(inProgressAttemptId);
        // The abandoned attempt's answer mirror must not linger on the device.
        clearExamMirror(inProgressAttemptId);
        setConfirmingAbandon(false);
        // Outside the button's transition (AGENTS.md router.refresh gotcha).
        startRefresh(() => router.refresh());
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-start">
      <Button onClick={start} disabled={pending} size="lg" className="sm:px-8">
        {pending ? t.common.loading : inProgressAttemptId ? t.exams.resumeExam : t.exams.startExam}
      </Button>
      {inProgressAttemptId &&
        (confirmingAbandon ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">{t.exams.confirmAbandonExam}</p>
            <Button variant="outline" size="sm" onClick={() => setConfirmingAbandon(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" size="sm" onClick={abandon} disabled={pending}>
              {t.exams.abandonExam}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={() => setConfirmingAbandon(true)}
            disabled={pending}
          >
            {t.exams.abandonExam}
          </Button>
        ))}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
