"use client";

import { Suspense, use } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { fill } from "@/lib/i18n/fill";
import { splitLocalePath } from "@/lib/i18n/routing";
import type { ShellMetas } from "@/lib/queries/shell";
import { cn } from "@/lib/utils";
import { activeMainKey, MAIN_NAV } from "./nav-items";

/**
 * Phone navigation: four tabs at the thumb. Practice owns every skill hub, so
 * the tab stays lit on /reading, /vocabulary, …. `data-bottom-nav` lets fixed
 * overlays (toasts, the book tutor dock) lift above the bar.
 */
export function BottomTabs({ metas }: { metas: Promise<ShellMetas> }) {
  const t = useT();
  const { rest: pathname } = splitLocalePath(usePathname());
  const activeKey = activeMainKey(pathname);

  return (
    <nav
      data-bottom-nav
      aria-label={t.nav.mainNav}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden"
    >
      {MAIN_NAV.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-md outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-brand-ink" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-[1.375rem]" aria-hidden />
            <span className={cn("text-xs leading-tight", active ? "font-semibold" : "font-medium")}>
              {item.key === "tutor" ? t.nav.tutorTab : t.nav[item.key]}
            </span>
            {item.key === "mistakes" ? (
              <Suspense fallback={null}>
                <TabBadge metas={metas} />
              </Suspense>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function TabBadge({ metas }: { metas: Promise<ShellMetas> }) {
  const t = useT();
  const { activeMistakes } = use(metas);
  if (activeMistakes <= 0) return null;
  return (
    <span
      aria-label={fill(t.nav.mistakesBadge, { n: activeMistakes })}
      className="absolute top-1 left-[calc(50%+0.5rem)] flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-coral px-1 text-[0.6875rem] font-semibold text-coral-foreground tabular-nums"
    >
      {activeMistakes}
    </span>
  );
}
