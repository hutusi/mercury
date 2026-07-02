"use client";

import {
  BookMarked,
  BookOpenText,
  Headphones,
  LayoutDashboard,
  Mic,
  PenLine,
  Timer,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { splitLocalePath } from "@/lib/i18n/routing";

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "vocabulary", href: "/vocabulary", icon: BookMarked },
  { key: "reading", href: "/reading", icon: BookOpenText },
  { key: "listening", href: "/listening", icon: Headphones },
  { key: "writing", href: "/writing", icon: PenLine },
  { key: "speaking", href: "/speaking", icon: Mic },
] as const;

export function NavLinks({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const t = useT();
  // usePathname() includes the locale segment; compare against the app path.
  const { rest: pathname } = splitLocalePath(usePathname());

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string, highlight = false) => {
    const active = isActive(href);
    const base =
      orientation === "vertical"
        ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        : "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
    if (active) {
      return `${base} ${
        highlight
          ? "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300"
          : "bg-sidebar-accent text-sidebar-accent-foreground"
      }`;
    }
    return `${base} ${
      highlight
        ? "text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-400/10"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;
  };

  return (
    <>
      {NAV_ITEMS.map((item) => (
        <Link key={item.key} href={item.href} className={linkClass(item.href)}>
          <item.icon className="size-4" aria-hidden />
          {t.nav[item.key]}
        </Link>
      ))}
      {/* Mock exam mode: visually distinct — it is the funnel's centerpiece */}
      <Link href="/exams" className={linkClass("/exams", true)}>
        <Timer className="size-4" aria-hidden />
        {t.nav.exams}
      </Link>
    </>
  );
}
