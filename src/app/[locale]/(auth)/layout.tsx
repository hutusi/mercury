import type { Metadata } from "next";
import { Wordmark } from "@/components/layout/AppShell";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

// Login/registration carry no unique content worth indexing and are publicly
// linked from the landing page — keep them out of the search index. noindex
// (over a robots.txt Disallow) reliably drops them; a disallowed-but-linked URL
// can still surface as a bare result.
export const metadata: Metadata = { robots: { index: false } };

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8">
        <Wordmark />
      </Link>
      <div className="w-full max-w-md border border-border p-8">{children}</div>
    </main>
  );
}
