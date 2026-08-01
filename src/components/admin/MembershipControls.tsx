"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { grantPremium, revokePremium } from "@/lib/actions/admin";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * Per-row grant/revoke. The button gates on the action round-trip only; the
 * refresh runs in its own non-gating transition (never revalidatePath — see
 * the ReminderToggle precedent).
 */
export function MembershipControls({ userId, tier }: { userId: string; tier: "free" | "premium" }) {
  const t = useT();
  const router = useRouter();
  const [expiry, setExpiry] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  async function run(action: () => Promise<{ ok: boolean }>) {
    setPending(true);
    setFailed(false);
    try {
      const result = await action();
      if (result.ok) {
        startTransition(() => router.refresh());
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {tier === "free" ? (
        <>
          <Input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            aria-label={t.admin.expiryLabel}
            disabled={pending}
            className="h-8 w-36 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => grantPremium({ userId, expiresAt: expiry || null }))}
          >
            {pending ? t.admin.working : t.admin.grant}
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => revokePremium({ userId }))}
        >
          {pending ? t.admin.working : t.admin.revoke}
        </Button>
      )}
      {failed ? <span className="text-xs text-cinnabar">{t.admin.actionFailed}</span> : null}
    </div>
  );
}
