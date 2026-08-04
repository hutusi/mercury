"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { registerPremiumInterest } from "@/lib/actions/premium";
import { useT } from "@/lib/i18n/LocaleProvider";

/** 预约开通 — the demand signal while premium has no purchase flow. */
export function InterestButton({ initialInterested }: { initialInterested: boolean }) {
  const t = useT();
  const [interested, setInterested] = useState(initialInterested);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (interested) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        <Check className="size-4" aria-hidden />
        {t.premium.interested}
      </p>
    );
  }

  return (
    <div>
      <Button
        variant="accent"
        size="lg"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await registerPremiumInterest();
              setInterested(true);
            } catch {
              setError(t.auth.genericError);
            }
          });
        }}
      >
        {pending ? t.common.loading : t.premium.interestCta}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
