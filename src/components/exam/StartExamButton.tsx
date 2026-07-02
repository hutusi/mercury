"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startExamAttempt } from "@/lib/actions/exams";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export function StartExamButton({ examId, resume }: { examId: string; resume: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="space-y-3">
      <Button
        onClick={start}
        disabled={pending}
        variant="accent"
        size="lg"
        className="h-12 w-full px-6 text-base sm:w-auto"
      >
        {pending ? t.common.loading : resume ? t.exams.resumeExam : t.exams.startExam}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
