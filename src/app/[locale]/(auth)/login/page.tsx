"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useEmailAuthEnabled } from "@/components/auth/AuthFeaturesContext";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export default function LoginPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailAuthEnabled = useEmailAuthEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resent, setResent] = useState(false);

  // Success notices from the verify-email landing and the reset flow.
  const notice = searchParams.get("verified")
    ? t.auth.verifiedNotice
    : searchParams.get("reset")
      ? t.auth.resetNotice
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotVerified(false);
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      // sendOnSignIn already re-sent the verification link before this 403.
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setNotVerified(true);
        setResent(false);
        setError(t.auth.emailNotVerified);
      } else {
        setError(error.message ?? t.auth.genericError);
      }
      setPending(false);
      return;
    }
    router.push(localePath(locale, "/dashboard"));
    router.refresh();
  }

  async function handleResend() {
    setError(null);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: localePath(locale, "/verify-email"),
    });
    if (error) {
      setError(error.message ?? t.auth.genericError);
      return;
    }
    setResent(true);
  }

  return (
    <div className="space-y-6">
      <EntryHeader
        size="md"
        title={t.auth.loginTitle}
        ipa={t.entry.loginIpa}
        pos={t.entry.loginPos}
        gloss={t.auth.loginSubtitle}
        className="pb-5"
      />
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            {emailAuthEnabled && (
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
              >
                {t.auth.forgotPassword}
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notVerified &&
          (resent ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t.auth.emailResent}
            </p>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={handleResend}>
              {t.auth.resendEmail}
            </Button>
          ))}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.auth.signingIn : t.auth.signIn}
        </Button>
      </form>
      <SocialButtons />
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
        >
          {t.auth.registerLink}
        </Link>
      </p>
    </div>
  );
}
