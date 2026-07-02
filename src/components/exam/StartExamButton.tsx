"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { startExamAttempt } from "@/lib/actions/exams";
import { useT } from "@/lib/i18n/LocaleProvider";

export function StartExamButton({ examId, resume }: { examId: string; resume: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      await startExamAttempt(examId);
      router.push(`/exams/${examId}/take`);
    });
  }

  return (
    <button
      onClick={start}
      disabled={pending}
      className={`w-full rounded-lg px-6 py-3.5 font-semibold text-white shadow-sm transition disabled:opacity-50 sm:w-auto ${
        resume ? "bg-accent-500 hover:bg-accent-600" : "bg-brand-600 hover:bg-brand-700"
      }`}
    >
      {pending ? t.common.loading : resume ? t.exams.resumeExam : t.exams.startExam}
    </button>
  );
}
