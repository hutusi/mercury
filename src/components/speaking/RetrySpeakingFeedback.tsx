"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retrySpeakingFeedback } from "@/lib/actions/speaking";
import { useT } from "@/lib/i18n/LocaleProvider";

/** Re-runs AI grading on a self-assessed submission, then refreshes the page. */
export function RetrySpeakingFeedback({ submissionId }: { submissionId: string }) {
  const t = useT();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <Button
        variant="accent"
        size="sm"
        disabled={pending}
        onClick={() => {
          setFailed(false);
          startTransition(async () => {
            try {
              await retrySpeakingFeedback(submissionId, crypto.randomUUID());
              router.refresh();
            } catch {
              setFailed(true);
            }
          });
        }}
      >
        <RotateCcw className="size-4" aria-hidden />
        {pending ? t.speaking.submitting : t.speaking.retryFeedback}
      </Button>
      {failed && <p className="mt-2 text-destructive">{t.speaking.aiFailed}</p>}
    </div>
  );
}
