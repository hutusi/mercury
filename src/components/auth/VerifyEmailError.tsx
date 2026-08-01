"use client";

import { useState } from "react";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { localePath } from "@/lib/i18n/routing";

// A dead token can't identify the user, so the address must be re-entered.
// sendVerificationEmail is constant-time for unknown emails — no enumeration.
export function VerifyEmailError({ code }: { code: string }) {
  const t = useT();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const gloss = code === "TOKEN_EXPIRED" ? t.auth.verifyExpired : t.auth.verifyInvalid;

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: localePath(locale, "/verify-email"),
      });
      if (error) {
        setError(error.message ?? t.auth.genericError);
        return;
      }
      setSent(true);
    } catch {
      setError(t.auth.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <EntryHeader
        size="md"
        title={t.auth.verifyTitle}
        ipa={t.entry.verifyIpa}
        pos={t.entry.verifyPos}
        gloss={gloss}
        className="pb-5"
      />
      {sent ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t.auth.emailResent}
        </p>
      ) : (
        <form onSubmit={handleResend} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t.auth.sendingEmail : t.auth.resendEmail}
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
        >
          {t.auth.verifiedGoLogin}
        </Link>
      </p>
    </div>
  );
}
