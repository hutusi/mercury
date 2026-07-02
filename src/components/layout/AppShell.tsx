import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { LanguageToggle } from "./LanguageToggle";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";
import { SkipLink } from "./SkipLink";
import { ThemeToggle } from "./ThemeToggle";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      {/* Square cinnabar seal (印章) — deliberately the only filled-red surface. */}
      <span
        className={`flex items-center justify-center bg-cinnabar font-serif font-semibold text-cinnabar-foreground ${
          compact ? "size-7 text-sm" : "size-8"
        }`}
        aria-hidden
      >
        M
      </span>
      <span className="font-serif text-lg font-semibold tracking-tight">Mercury</span>
    </span>
  );
}

export async function AppShell({
  userName,
  trackSwitcher,
  children,
}: {
  userName: string;
  trackSwitcher?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = await getDict();

  return (
    <div className="min-h-screen bg-background">
      <SkipLink label={t.a11y.skipToContent} />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-2" aria-label={t.common.appName}>
          <Wordmark />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          <NavLinks orientation="vertical" />
        </nav>
      </aside>

      <div className="md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b bg-background">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/dashboard" className="md:hidden" aria-label={t.common.appName}>
              <Wordmark compact />
            </Link>
            <div className="flex flex-1 items-center justify-end gap-2">
              {trackSwitcher}
              <LanguageToggle />
              <ThemeToggle />
              <span className="hidden max-w-32 truncate text-sm font-medium text-muted-foreground sm:block">
                {userName}
              </span>
              <SignOutButton label={t.common.signOut} />
            </div>
          </div>
          {/* Mobile nav strip */}
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            <NavLinks orientation="horizontal" />
          </nav>
        </header>

        <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
