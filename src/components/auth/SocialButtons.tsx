"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import type { SocialProviderId } from "@/lib/auth/social-providers";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";
import { useSocialProviders } from "./AuthFeaturesContext";

// Brand marks are monochrome inline SVGs on currentColor: lucide carries no
// brand icons, and icons stay ink per the design system (docs/DESIGN.md).
function GoogleMark() {
  return (
    <svg viewBox="0 0 488 512" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function SocialButtons() {
  const providers = useSocialProviders();
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<SocialProviderId | null>(null);
  const [clickError, setClickError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  // better-auth's OAuth callback bounces failures to errorCallbackURL with
  // ?error=<code> (spaces become underscores); account_not_linked is the one
  // learners can act on themselves, everything else gets the generic copy.
  const callbackError = searchParams.get("error");
  const error =
    clickError ??
    (callbackError === "account_not_linked"
      ? t.auth.accountNotLinked
      : callbackError
        ? t.auth.socialError
        : null);

  async function handleClick(provider: SocialProviderId) {
    setClickError(null);
    setPending(provider);
    const { error } = await authClient.signIn.social({
      provider,
      // All locale-prefixed: an unprefixed path makes the proxy 307-hop the
      // OAuth return and re-derive the locale from the cookie (src/proxy.ts).
      callbackURL: localePath(locale, "/dashboard"),
      newUserCallbackURL: localePath(locale, "/onboarding"),
      errorCallbackURL: pathname,
    });
    if (error) {
      setPending(null);
      setClickError(t.auth.socialError);
    }
    // On success better-auth navigates to the provider — pending stays set
    // until the page unloads so the button can't be double-clicked.
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">{t.auth.orContinueWith}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        {providers.map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending !== null}
            onClick={() => handleClick(provider)}
          >
            {provider === "google" ? <GoogleMark /> : <GitHubMark />}
            {pending === provider
              ? t.auth.redirecting
              : provider === "google"
                ? t.auth.continueWithGoogle
                : t.auth.continueWithGitHub}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
