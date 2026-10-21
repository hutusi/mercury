"use client";

import { Suspense, use } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { fill } from "@/lib/i18n/fill";
import { splitLocalePath } from "@/lib/i18n/routing";
import type { ShellMetas } from "@/lib/queries/shell";
import { cn } from "@/lib/utils";
import { isActivePath, MAIN_NAV, PRACTICE_NAV, type NavItem } from "./nav-items";

/**
 * Desktop sidebar navigation: the four destinations, with every skill hub
 * one click away under Practice. Live numbers (due words, the weak skill,
 * mistakes to clear) stream in from the shell's metas promise and never
 * hold up the page.
 */
export function SideNav({ metas }: { metas: Promise<ShellMetas> }) {
  const t = useT();
  const { rest: pathname } = splitLocalePath(usePathname());

  const main = (item: NavItem) => {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.key}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-md px-3 py-1 text-[0.9375rem] outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-brand-soft font-semibold text-brand-ink"
            : "font-medium text-foreground hover:bg-accent",
        )}
      >
        <item.icon className="size-[1.1875rem] shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {item.key === "tutor" ? t.nav.tutorTab : t.nav[item.key]}
        </span>
        {item.key === "mistakes" ? (
          <Suspense fallback={null}>
            <MistakesBadge metas={metas} />
          </Suspense>
        ) : null}
      </Link>
    );
  };

  return (
    <nav aria-label={t.nav.mainNav} className="flex flex-col gap-0.5">
      {main(MAIN_NAV[0])}
      {main(MAIN_NAV[1])}
      {PRACTICE_NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-8 items-center gap-2.5 rounded-sm py-1 pr-3 pl-[2.6875rem] text-sm leading-tight outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-soft-3 hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{t.nav[item.key]}</span>
            <Suspense fallback={null}>
              <SkillMeta item={item} metas={metas} />
            </Suspense>
          </Link>
        );
      })}
      {main(MAIN_NAV[2])}
      {main(MAIN_NAV[3])}
    </nav>
  );
}

function SkillMeta({ item, metas }: { item: NavItem; metas: Promise<ShellMetas> }) {
  const t = useT();
  const { dueCount, weakestSkill } = use(metas);
  if (item.key === "vocabulary" && dueCount > 0) {
    return (
      <span className="shrink-0 text-xs font-medium text-brand-ink tabular-nums">
        {fill(t.nav.dueMeta, { n: dueCount })}
      </span>
    );
  }
  if (item.skill && item.skill === weakestSkill) {
    return <span className="shrink-0 text-xs font-medium text-coral-ink">{t.nav.weakMeta}</span>;
  }
  return null;
}

function MistakesBadge({ metas }: { metas: Promise<ShellMetas> }) {
  const t = useT();
  const { activeMistakes } = use(metas);
  if (activeMistakes <= 0) return null;
  return (
    <span
      aria-label={fill(t.nav.mistakesBadge, { n: activeMistakes })}
      className="flex h-[1.375rem] min-w-[1.375rem] shrink-0 items-center justify-center rounded-full bg-coral-soft px-1.5 text-xs font-semibold text-coral-ink-2 tabular-nums"
    >
      {activeMistakes}
    </span>
  );
}
