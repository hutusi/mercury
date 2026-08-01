import type { Metadata } from "next";
import { SocialProvidersProvider } from "@/components/auth/SocialProvidersContext";
import { Wordmark } from "@/components/layout/AppShell";
import { enabledSocialProviders } from "@/lib/auth/social-providers";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

// Login/registration carry no unique content worth indexing and are publicly
// linked from the landing page — keep them out of the search index. noindex
// (over a robots.txt Disallow) reliably drops them; a disallowed-but-linked URL
// can still surface as a bare result.
export const metadata: Metadata = { robots: { index: false } };

// Social buttons must reflect the *runtime* env — the keyless e2e server blanks
// the OAuth vars while `next build` ran with the developer's .env — so these
// pages must never be statically baked. Forced dynamic rendering also keeps
// useSearchParams (in SocialButtons) Suspense-free.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8">
        <Wordmark />
      </Link>
      <div className="w-full max-w-md border border-border p-8">
        <SocialProvidersProvider providers={enabledSocialProviders(process.env)}>
          {children}
        </SocialProvidersProvider>
      </div>
    </main>
  );
}
