"use client";

import { createContext, useContext } from "react";
import type { SocialProviderId } from "@/lib/auth/social-providers";

// Which social providers the server actually registered (env-dependent). Fed by
// the (auth) layout so client pages never guess at server-only env vars.
const SocialProvidersContext = createContext<SocialProviderId[]>([]);

export function SocialProvidersProvider({
  providers,
  children,
}: {
  providers: SocialProviderId[];
  children: React.ReactNode;
}) {
  return (
    <SocialProvidersContext.Provider value={providers}>{children}</SocialProvidersContext.Provider>
  );
}

export function useSocialProviders(): SocialProviderId[] {
  return useContext(SocialProvidersContext);
}
