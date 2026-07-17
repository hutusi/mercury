"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitWriting } from "@/lib/actions/writing";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export function WritingEditor({ promptId, minWords }: { promptId: string; minWords: number }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submissionRequestRef = useRef<LogicalRequestId | null>(null);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const enough = wordCount >= minWords;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const request = requestIdForInput(submissionRequestRef.current, text);
        submissionRequestRef.current = request;
        const { submissionId } = await submitWriting({
          requestId: request.requestId,
          promptId,
          text,
        });
        submissionRequestRef.current = null;
        router.push(localePath(locale, `/writing/submissions/${submissionId}`));
      } catch {
        setError(t.auth.genericError);
      }
    });
  }

  return (
    <div className="space-y-3">
      <label htmlFor="writing-response" className="sr-only">
        {t.writing.responseLabel}
      </label>
      <textarea
        id="writing-response"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.writing.placeholder}
        rows={14}
        disabled={pending}
        aria-describedby={`writing-word-count${error ? " writing-error" : ""}`}
        aria-invalid={error !== null}
        className="w-full border border-input bg-background p-4 font-serif text-sm leading-relaxed transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-hidden disabled:bg-muted"
      />
      <div className="flex items-center justify-between">
        <p
          id="writing-word-count"
          className={`font-mono text-sm font-medium tabular-nums ${
            enough ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {t.writing.wordCount}: {wordCount} / {minWords}
          {!enough && wordCount > 0 && (
            <span className="ml-2 font-sans text-cinnabar">{t.writing.tooShort}</span>
          )}
        </p>
        <Button
          onClick={submit}
          disabled={pending || !enough}
          className="disabled:cursor-not-allowed"
        >
          {pending ? t.writing.submitting : t.writing.submitForFeedback}
        </Button>
      </div>
      {error && (
        <p id="writing-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {pending && (
        <div
          role="status"
          className="border border-border bg-muted p-3 text-center text-sm text-muted-foreground"
        >
          {t.writing.submitting}
        </div>
      )}
    </div>
  );
}
