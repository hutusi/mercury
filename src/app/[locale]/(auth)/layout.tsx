import type { Metadata } from "next";
import { AuthFeaturesProvider } from "@/components/auth/AuthFeaturesContext";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { enabledSocialProviders } from "@/lib/auth/social-providers";
import { isEmailEnabled } from "@/lib/email/enabled";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

// Login/registration carry no unique content worth indexing and are publicly
// linked from the landing page — keep them out of the search index. noindex
// (over a robots.txt Disallow) reliably drops them; a disallowed-but-linked URL
// can still surface as a bare result.
export const metadata: Metadata = { robots: { index: false } };

// Auth-feature UI (social buttons, forgot-password link) must reflect the
// *runtime* env — the keyless e2e server blanks the keys while `next build`
// ran with the developer's .env — so these pages must never be statically
// baked. Forced dynamic rendering also keeps useSearchParams Suspense-free.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-[72.5rem] items-center gap-3 px-4 py-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <div className="flex-1" />
        <LanguageToggle />
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0"
      >
        <div className="w-full max-w-[26.25rem] rounded-2xl border border-border bg-card p-6 shadow-lift sm:p-8">
          <AuthFeaturesProvider
            features={{
              providers: enabledSocialProviders(process.env),
              emailEnabled: isEmailEnabled(process.env),
            }}
          >
            {children}
          </AuthFeaturesProvider>
        </div>
      </main>
    </div>
  );
}
