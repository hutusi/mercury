"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retryWritingFeedback } from "@/lib/actions/writing";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { retryWhileInProgress } from "@/lib/in-progress-retry";
import { useT } from "@/lib/i18n/LocaleProvider";

/** Re-runs AI grading on a self-assessed submission, then refreshes the page. */
export function RetryWritingFeedback({ submissionId }: { submissionId: string }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startRefresh] = useTransition();
  // One idempotency key per submission: a double tap or lost-response retry
  // joins the in-flight grading instead of claiming (and charging) again.
  const requestRef = useRef<LogicalRequestId | null>(null);

  return (
    <div>
      <Button
        disabled={pending}
        onClick={() => {
          setError(null);
          const request = requestIdForInput(requestRef.current, submissionId);
          requestRef.current = request;
          startTransition(async () => {
            try {
              const result = await retryWhileInProgress(
                () => retryWritingFeedback(submissionId, request.requestId),
                (r) => r.inProgress === true,
              );
              if (result.limited) {
                setError(t.writing.aiQuotaRetry);
                return;
              }
              if (result.inProgress) {
                setError(t.common.stillGrading);
                return;
              }
              // Refresh outside the button's transition so a slow re-render
              // never holds it disabled (AGENTS.md: router.refresh gotcha).
              startRefresh(() => router.refresh());
            } catch {
              setError(t.writing.aiFailed);
            }
          });
        }}
      >
        <RotateCcw className="size-4" aria-hidden />
        {pending ? t.writing.submitting : t.writing.retryFeedback}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
