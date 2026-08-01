"use client";

import { MailWarning } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { authClient } from "@/lib/auth/client";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

// Soft verification (ADR 0028): unverified users keep their session and get
// this quiet nudge on every (app) page instead of a sign-in wall. The (app)
// layout owns the render gate (email enabled + user unverified), so this
// component never guesses at server state; with no session cookie-cache the
// banner disappears on the first navigation after the link is clicked.
export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useT();
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setError(null);
    setPending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: localePath(locale, "/verify-email"),
      });
      if (error) {
        // A stale render raced an already-completed verification — the banner
        // is gone on the next navigation, so report success, not failure.
        if (error.code === "EMAIL_ALREADY_VERIFIED") {
          setResent(true);
          return;
        }
        // Covers the 3/60s rate limit too (429 resolves as {error}).
        setError(t.auth.genericError);
        return;
      }
      setResent(true);
    } catch {
      setError(t.auth.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Callout variant="muted" role="status" className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <MailWarning className="size-4 shrink-0 text-cinnabar" aria-hidden />
            {t.auth.verifyBannerTitle}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t.auth.verifyBannerBody} <span className="font-medium text-foreground">{email}</span>
          </p>
          {error && (
            <p role="alert" className="mt-1.5 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={pending || resent}
          onClick={handleResend}
        >
          {pending ? t.auth.sendingEmail : resent ? t.auth.emailResent : t.auth.resendEmail}
        </Button>
      </div>
    </Callout>
  );
}
