"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { localePath } from "@/lib/i18n/routing";

// better-auth's GET /reset-password/:token redirects here with ?token= on a
// valid link, or ?error=INVALID_TOKEN on a dead one.
export function ResetPasswordForm() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState(!token || Boolean(searchParams.get("error")));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      if (error.code === "INVALID_TOKEN") {
        setInvalid(true);
      } else if (error.code === "PASSWORD_TOO_SHORT") {
        setError(t.auth.passwordHint);
      } else {
        setError(error.message ?? t.auth.genericError);
      }
      setPending(false);
      return;
    }
    router.push(localePath(locale, "/login?reset=1"));
  }

  return (
    <div className="space-y-6">
      <EntryHeader
        size="md"
        title={t.auth.resetTitle}
        ipa={t.entry.resetIpa}
        pos={t.entry.resetPos}
        gloss={invalid ? t.auth.resetInvalid : `${t.auth.newPassword} · ${t.auth.passwordHint}`}
        className="pb-5"
      />
      {invalid ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
          >
            {t.auth.sendResetLink}
          </Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.auth.newPassword}</Label>
            <Input
              id="password"
              type="password"
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
            {pending ? t.auth.sendingEmail : t.auth.resetSubmit}
          </Button>
        </form>
      )}
    </div>
  );
}
