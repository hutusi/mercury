"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { abandonExamAttempt, startExamAttempt } from "@/lib/actions/exams";
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
        setConfirmingAbandon(false);
        router.refresh();
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={start}
        disabled={pending}
        variant="accent"
        size="lg"
        className="h-12 w-full px-6 text-base sm:w-auto"
      >
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
            variant="outline"
            size="sm"
            onClick={() => setConfirmingAbandon(true)}
            disabled={pending}
          >
            {t.exams.abandonExam}
          </Button>
        ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
