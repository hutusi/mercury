import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { ShellMetas } from "@/lib/queries/shell";
import { BottomTabs } from "./BottomTabs";
import { LanguageToggle } from "./LanguageToggle";
import { ProfileMenu } from "./ProfileMenu";
import { SideNav } from "./SideNav";
import { SkipLink } from "./SkipLink";
import { Wordmark } from "./Wordmark";

/**
 * The hub-page shell. Desktop: a 248px sidebar (wordmark, grouped nav, the
 * plan card slot, the avatar menu and 中/EN). Phones: a 58px top bar and four
 * bottom tabs. `--chrome-top` tells sticky page elements how much fixed chrome
 * sits above them; `--bottom-nav-h` how much sits below (the phone tabs).
 */
export async function AppShell({
  userName,
  isAdmin = false,
  metas,
  planCard,
  banner,
  children,
}: {
  userName: string;
  isAdmin?: boolean;
  /** Live nav numbers, streamed — never awaited by the shell. */
  metas: Promise<ShellMetas>;
  /** The sidebar's mini "today's plan" card (desktop only). */
  planCard?: React.ReactNode;
  /** Persistent notice above the page (e.g. the unverified-email nudge). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = await getDict();

  return (
    <div className="min-h-dvh bg-background [--bottom-nav-h:calc(4rem+env(safe-area-inset-bottom))] [--chrome-top:3.625rem] md:flex md:[--bottom-nav-h:0px] md:[--chrome-top:0px]">
      <SkipLink label={t.a11y.skipToContent} />

      <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-4 overflow-x-hidden overflow-y-auto border-r border-border px-3.5 pt-[1.125rem] pb-3.5 md:flex">
        <Link
          href="/dashboard"
          aria-label={t.common.appName}
          className="w-fit rounded-md px-2.5 py-1 outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <SideNav metas={metas} />
        {planCard}
        <div className="flex-1" />
        <div className="flex items-center gap-2.5 px-1.5">
          <ProfileMenu name={userName} isAdmin={isAdmin} metas={metas} variant="sidebar" />
          <LanguageToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[3.625rem] items-center gap-2.5 border-b border-border bg-background px-4 md:hidden">
          <Link
            href="/dashboard"
            aria-label={t.common.appName}
            className="rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark compact />
          </Link>
          <div className="flex-1" />
          <LanguageToggle />
          <ProfileMenu name={userName} isAdmin={isAdmin} metas={metas} variant="compact" />
        </header>

        {banner ? (
          <div className="mx-auto w-full max-w-[68.75rem] px-4 pt-6 sm:px-8 lg:px-12">{banner}</div>
        ) : null}

        <main
          id="main-content"
          className="mx-auto w-full max-w-[68.75rem] flex-1 px-4 pt-6 pb-28 sm:px-8 md:pt-12 md:pb-16 lg:px-12"
        >
          {children}
        </main>

        <BottomTabs metas={metas} />
      </div>
    </div>
  );
}
