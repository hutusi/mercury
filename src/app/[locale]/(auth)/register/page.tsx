"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export default function RegisterPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    let navigated = false;
    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        // Landing page for the sendOnSignUp verification link (ADR 0028) —
        // verification is soft, so sign-up issues a session immediately and
        // the user heads straight to onboarding with the in-app banner.
        callbackURL: localePath(locale, "/verify-email"),
      });
      if (error) {
        setError(
          error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? t.auth.emailTaken
            : (error.message ?? t.auth.genericError),
        );
        return;
      }
      navigated = true;
      router.push(localePath(locale, "/dashboard"));
      router.refresh();
    } catch {
      setError(t.auth.genericError);
    } finally {
      // Keep the button disabled while the App Router transition runs — a
      // re-enabled form on slow navigation invites duplicate submits.
      if (!navigated) setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <EntryHeader
        size="md"
        title={t.auth.registerTitle}
        ipa={t.entry.registerIpa}
        pos={t.entry.registerPos}
        gloss={t.auth.registerSubtitle}
        className="pb-5"
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.auth.name}</Label>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
          <Label htmlFor="password">
            {t.auth.password} · {t.auth.passwordHint}
          </Label>
          <PasswordInput
            id="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.auth.signingUp : t.auth.signUp}
        </Button>
      </form>
      <SocialButtons />
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
        >
          {t.auth.loginLink}
        </Link>
      </p>
    </div>
  );
}
