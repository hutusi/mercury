"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { submitWriting } from "@/lib/actions/writing";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export function WritingEditor({ promptId, minWords }: { promptId: string; minWords: number }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const enough = wordCount >= minWords;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const { submissionId } = await submitWriting({ promptId, text });
        router.push(localePath(locale, `/writing/submissions/${submissionId}`));
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
        className="w-full rounded-xl border bg-card p-4 text-sm leading-relaxed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:bg-muted"
      />
      <div className="flex items-center justify-between">
        <p
          className={`text-sm font-medium ${enough ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
        >
          {t.writing.wordCount}: {wordCount} / {minWords}
          {!enough && wordCount > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">{t.writing.tooShort}</span>
          )}
        </p>
        <button
          onClick={submit}
          disabled={pending || !enough}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? t.writing.submitting : t.writing.submitForFeedback}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {pending && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-center text-sm text-primary">
          {t.writing.submitting}
        </div>
      )}
    </div>
  );
}
