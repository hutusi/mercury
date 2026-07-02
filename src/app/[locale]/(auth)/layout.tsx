import { Wordmark } from "@/components/layout/AppShell";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

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
