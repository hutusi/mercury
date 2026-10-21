"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retrySpeakingFeedback } from "@/lib/actions/speaking";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { retryWhileInProgress } from "@/lib/in-progress-retry";
import { useT } from "@/lib/i18n/LocaleProvider";

/** Re-runs AI grading on a self-assessed submission, then refreshes the page. */
export function RetrySpeakingFeedback({ submissionId }: { submissionId: string }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startRefresh] = useTransition();
  // One idempotency key per submission (see RetryWritingFeedback).
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
                () => retrySpeakingFeedback(submissionId, request.requestId),
                (r) => "inProgress" in r,
              );
              if ("limited" in result) {
                setError(t.speaking.aiQuotaRetry);
                return;
              }
              if ("inProgress" in result) {
                setError(t.common.stillGrading);
                return;
              }
              startRefresh(() => router.refresh());
            } catch {
              setError(t.speaking.aiFailed);
            }
          });
        }}
      >
        <RotateCcw className="size-4" aria-hidden />
        {pending ? t.speaking.submitting : t.speaking.retryFeedback}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
