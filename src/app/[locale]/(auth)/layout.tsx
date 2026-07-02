import { Wordmark } from "@/components/layout/AppShell";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/[0.06] to-transparent"
        aria-hidden
      />
      <Link href="/" className="relative mb-8">
        <Wordmark />
      </Link>
      <div className="relative w-full max-w-md rounded-xl border bg-card p-8 shadow-xs">
        {children}
      </div>
    </main>
  );
}
