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

export function ForgotPasswordForm() {
  const t = useT();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: localePath(locale, "/reset-password"),
    });
    setPending(false);
    if (error) {
      // Only transport-level failures land here — the endpoint itself never
      // reveals whether the email exists.
      setError(error.message ?? t.auth.genericError);
      return;
    }
    setSent(true);
  }

  return (
    <div className="space-y-6">
      <EntryHeader
        size="md"
        title={t.auth.forgotTitle}
        ipa={t.entry.resetIpa}
        pos={t.entry.resetPos}
        gloss={t.auth.forgotSubtitle}
        className="pb-5"
      />
      {sent ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t.auth.resetLinkSent}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
            {pending ? t.auth.sendingEmail : t.auth.sendResetLink}
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
        >
          {t.auth.backToLogin}
        </Link>
      </p>
    </div>
  );
}
