"use client";

import { createContext, useContext } from "react";
import type { SocialProviderId } from "@/lib/auth/social-providers";

// Which auth features the server actually registered (env-dependent). Fed by
// the (auth) layout so client pages never guess at server-only env vars.
interface AuthFeatures {
  providers: SocialProviderId[];
  emailEnabled: boolean;
}

const AuthFeaturesContext = createContext<AuthFeatures>({ providers: [], emailEnabled: false });

export function AuthFeaturesProvider({
  features,
  children,
}: {
  features: AuthFeatures;
  children: React.ReactNode;
}) {
  return <AuthFeaturesContext.Provider value={features}>{children}</AuthFeaturesContext.Provider>;
}

export function useSocialProviders(): SocialProviderId[] {
  return useContext(AuthFeaturesContext).providers;
}

export function useEmailAuthEnabled(): boolean {
  return useContext(AuthFeaturesContext).emailEnabled;
}
