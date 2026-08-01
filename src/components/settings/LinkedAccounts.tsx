"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { GitHubMark, GoogleMark } from "@/components/auth/SocialButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import type { SocialProviderId } from "@/lib/auth/social-providers";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

const PROVIDER_NAMES: Record<SocialProviderId, string> = { google: "Google", github: "GitHub" };

export function LinkedAccounts({
  accounts,
  providers,
  emailVerified,
}: {
  accounts: { providerId: string; accountId: string }[];
  providers: SocialProviderId[];
  // Soft verification (ADR 0028): linking is the one verification-gated
  // operation; the server enforces via a /link-social before-hook, this
  // disabled state just explains it.
  emailVerified: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<string | null>(null);
  // linkSocial failures come back as a ?error= redirect from the OAuth flow.
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? t.settings.linkError : null,
  );
  const [, startTransition] = useTransition();

  // Unlinking the only remaining sign-in method would lock the user out; the
  // server enforces this too (allowUnlinkingAll defaults to false).
  const lastMethod = accounts.length <= 1;

  async function handleLink(provider: SocialProviderId) {
    setError(null);
    setPending(provider);
    try {
      const { error } = await authClient.linkSocial({
        provider,
        callbackURL: localePath(locale, "/settings"),
        errorCallbackURL: localePath(locale, "/settings"),
      });
      // On success the browser navigates to the provider — pending stays set.
      if (error) {
        setPending(null);
        setError(error.message ?? t.settings.linkError);
      }
    } catch {
      setPending(null);
      setError(t.settings.linkError);
    }
  }

  async function handleUnlink(providerId: string, accountId: string) {
    setError(null);
    setPending(providerId);
    try {
      const { error } = await authClient.unlinkAccount({ providerId, accountId });
      if (error) {
        setError(
          error.code === "SESSION_NOT_FRESH"
            ? t.settings.sessionNotFresh
            : (error.message ?? t.settings.linkError),
        );
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError(t.settings.linkError);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t.settings.linkedAccountsLabel}</p>
      {providers.map((provider) => {
        const linked = accounts.find((a) => a.providerId === provider);
        return (
          <div
            key={provider}
            className="flex items-center justify-between gap-3 border-t border-border pt-3"
          >
            <span className="flex items-center gap-2 text-sm">
              {provider === "google" ? <GoogleMark /> : <GitHubMark />}
              {PROVIDER_NAMES[provider]}
            </span>
            {linked ? (
              <span className="flex items-center gap-2">
                <Badge variant="outline">{t.settings.linked}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending !== null || lastMethod}
                  title={lastMethod ? t.settings.lastMethodHint : undefined}
                  onClick={() => handleUnlink(provider, linked.accountId)}
                >
                  {t.settings.unlinkAction}
                </Button>
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending !== null || !emailVerified}
                onClick={() => handleLink(provider)}
              >
                {pending === provider ? t.auth.redirecting : t.settings.linkAction}
              </Button>
            )}
          </div>
        );
      })}
      {!emailVerified && (
        <p className="text-sm text-muted-foreground">{t.settings.verifyToLinkHint}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
