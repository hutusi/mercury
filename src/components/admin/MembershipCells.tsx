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
  // Seeded once per mount by design: the parent keys this component by the
  // server snapshot, so refreshed data that differs remounts it. Local state
  // only has to outrun the refresh for this admin's own mutations — it never
  // needs to reconcile foreign changes.
  const [membership, setMembership] = useState({
    tier: initialTier,
    expiresAt: initialExpiresAt,
  });
  const [expiry, setExpiry] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"not_found" | "invalid_input" | "unknown" | null>(null);
  const [, startTransition] = useTransition();

  async function run(action: () => Promise<AdminMembershipResult>) {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (result.ok) {
        setMembership({ tier: result.tier, expiresAt: result.expiresAt });
        startTransition(() => router.refresh());
      } else {
        setError(result.error);
      }
    } catch {
      setError("unknown");
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
                // UX guard only (client-local today); the server rejects
                // non-future expiries regardless.
                min={new Date().toISOString().slice(0, 10)}
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
          {error ? (
            // role="alert": the failure lands after an async action with no
            // focus move, so screen readers need the live region to hear it.
            <span role="alert" className="text-xs text-cinnabar">
              {error === "invalid_input" ? t.admin.invalidExpiry : t.admin.actionFailed}
            </span>
          ) : null}
        </div>
      </td>
    </>
  );
}
