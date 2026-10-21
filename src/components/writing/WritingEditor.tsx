"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { StationNode } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { submitWriting } from "@/lib/actions/writing";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { DAY_MS } from "@/lib/drafts";
import { retryWhileInProgress } from "@/lib/in-progress-retry";
import { useDraft } from "@/lib/use-draft";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";
import { useFlowExit } from "@/lib/flow-store";
import { fill } from "@/lib/i18n/fill";
import { cn } from "@/lib/utils";

const isText = (value: unknown): value is string => typeof value === "string";
const isBlank = (value: string) => value.trim().length === 0;

export function WritingEditor({ promptId, minWords }: { promptId: string; minWords: number }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [restored, setRestored] = useState(false);
  const [pending, startTransition] = useTransition();
  const submissionRequestRef = useRef<LogicalRequestId | null>(null);

  // The essay lives only here until it is submitted: keep a local copy so a
  // reload, a crash, or a stray navigation never loses the learner's work.
  const draft = useDraft({
    kind: "writing",
    id: promptId,
    value: text,
    enabled: !pending,
    maxAgeMs: 30 * DAY_MS,
    validate: isText,
    isEmpty: isBlank,
    onRestore: (saved) => {
      // Text typed before the restore ran wins — and then nothing was
      // restored, so don't say so.
      if (text) return;
      setText(saved);
      setRestored(true);
    },
  });

  useFlowExit("saved", text.trim().length > 0);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const enough = wordCount >= minWords;

  function submit() {
    setError(null);
    setWaiting(false);
    startTransition(async () => {
      try {
        const request = requestIdForInput(submissionRequestRef.current, text);
        submissionRequestRef.current = request;
        // A resubmit of the same essay while the first call is still grading
        // waits for that result instead of failing (same request id).
        const result = await retryWhileInProgress(
          () => submitWriting({ requestId: request.requestId, promptId, text }),
          (r) => !r.ok,
          { onWait: () => setWaiting(true) },
        );
        setWaiting(false);
        if (!result.ok) {
          setError(t.common.stillGrading);
          return;
        }
        submissionRequestRef.current = null;
        draft.clear();
        // The submission row stores its degrade reason — the page renders the
        // quota notice from the row, no query-param relay needed.
        router.push(localePath(locale, `/writing/submissions/${result.submissionId}`));
      } catch {
        setWaiting(false);
        setError(t.common.submitRetry);
      }
    });
  }

  const progress = Math.min(1, wordCount / minWords);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-input bg-card transition-colors focus-within:border-ring">
        <label htmlFor="writing-response" className="sr-only">
          {t.writing.responseLabel}
        </label>
        <textarea
          id="writing-response"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRestored(false);
          }}
          placeholder={t.writing.placeholder}
          rows={14}
          disabled={pending}
          spellCheck={false}
          aria-describedby={`writing-word-count${error ? " writing-error" : ""}`}
          aria-invalid={error !== null}
          className="block min-h-72 w-full resize-y bg-transparent px-5 py-4 font-serif text-[1.0625rem] leading-[1.75] outline-hidden placeholder:font-sans placeholder:text-[0.9375rem] placeholder:text-muted-foreground disabled:opacity-60"
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border px-4 py-3">
          <div className="flex min-w-40 flex-1 items-center gap-3">
            <span aria-hidden className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-track">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                  enough ? "bg-brand" : "bg-soft-2",
                )}
                style={{ width: `${progress * 100}%` }}
              />
            </span>
            <p
              id="writing-word-count"
              className="text-[0.8125rem] text-muted-foreground tabular-nums"
            >
              <span className={enough ? "font-medium text-brand-ink" : undefined}>
                {fill(t.writing.words, { c: wordCount, n: minWords })}
              </span>
              {!enough && wordCount > 0 ? (
                <span className="ml-2">
                  {fill(t.writing.needMore, { n: minWords - wordCount })}
                </span>
              ) : null}
            </p>
          </div>
          <Button onClick={submit} disabled={pending || !enough}>
            {pending ? t.writing.submitting : t.writing.submitForFeedback}
          </Button>
        </div>
      </div>
      {restored ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t.common.draftRestored}
        </p>
      ) : null}
      {error ? (
        <Callout id="writing-error" variant="error" className="px-4 py-3 text-sm">
          {error}
        </Callout>
      ) : null}
      {pending ? (
        <Callout
          variant="accent"
          role="status"
          className="flex items-center gap-3 px-4 py-3 text-sm"
        >
          <StationNode className="size-6 shrink-0" />
          {waiting ? t.common.stillGrading : t.writing.submitting}
        </Callout>
      ) : null}
    </div>
  );
}
