"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { submitWriting } from "@/lib/actions/writing";
import { useT } from "@/lib/i18n/LocaleProvider";

export function WritingEditor({ promptId, minWords }: { promptId: string; minWords: number }) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const wordCount = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text],
  );
  const enough = wordCount >= minWords;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const { submissionId } = await submitWriting({ promptId, text });
        router.push(`/writing/submissions/${submissionId}`);
      } catch {
        setError(t.auth.genericError);
      }
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.writing.placeholder}
        rows={14}
        disabled={pending}
        className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm leading-relaxed focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-50"
      />
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${enough ? "text-green-600" : "text-slate-500"}`}>
          {t.writing.wordCount}: {wordCount} / {minWords}
          {!enough && wordCount > 0 && (
            <span className="ml-2 text-accent-600">{t.writing.tooShort}</span>
          )}
        </p>
        <button
          onClick={submit}
          disabled={pending || !enough}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? t.writing.submitting : t.writing.submitForFeedback}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {pending && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-center text-sm text-brand-700">
          {t.writing.submitting}
        </div>
      )}
    </div>
  );
}
