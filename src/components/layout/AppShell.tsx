import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getDict } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

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
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-3 text-xl font-bold tracking-tight text-brand-600">
          {t.common.appName}
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          <NavLinks orientation="vertical" />
        </nav>
      </aside>

      <div className="md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              href="/dashboard"
              className="text-lg font-bold tracking-tight text-brand-600 md:hidden"
            >
              {t.common.appName}
            </Link>
            <div className="flex flex-1 items-center justify-end gap-3">
              {trackSwitcher}
              <LanguageToggle />
              <span className="hidden max-w-32 truncate text-sm font-medium text-slate-700 sm:block">
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

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
