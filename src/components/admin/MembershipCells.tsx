"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { grantPremium, revokePremium, type AdminMembershipResult } from "@/lib/actions/admin";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * The membership-facing cells of one admin-table row (tier, expiry, actions).
 * The client owns this state: on success the action returns the canonical
 * persisted tier/expiry and the cells render it immediately — router.refresh()
 * runs only as background reconciliation (in its own non-gating transition,
 * never revalidatePath), so the row can never sit stale behind a slow refresh.
 */
export function MembershipCells({
  userId,
  tier: initialTier,
  expiresAt: initialExpiresAt,
}: {
  userId: string;
  tier: "free" | "premium";
  /** YYYY-MM-DD, only meaningful while premium. */
  expiresAt: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [membership, setMembership] = useState({
    tier: initialTier,
    expiresAt: initialExpiresAt,
  });
  const [expiry, setExpiry] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  async function run(action: () => Promise<AdminMembershipResult>) {
    setPending(true);
    setFailed(false);
    try {
      const result = await action();
      if (result.ok) {
        setMembership({ tier: result.tier, expiresAt: result.expiresAt });
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
    <>
      <td className="px-3 py-2">
        <Badge variant={membership.tier === "premium" ? "accent" : "outline"}>
          {membership.tier === "premium" ? t.admin.tierPremium : t.admin.tierFree}
        </Badge>
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {membership.tier === "premium" ? (membership.expiresAt ?? t.admin.noExpiry) : "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {membership.tier === "free" ? (
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
      </td>
    </>
  );
}
