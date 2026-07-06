"use client";

import {
  BookMarked,
  BookOpenText,
  Headphones,
  LayoutDashboard,
  Mic,
  NotebookPen,
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
  { key: "mistakes", href: "/mistakes", icon: NotebookPen },
] as const;

export function NavLinks({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const t = useT();
  // usePathname() includes the locale segment; compare against the app path.
  const { rest: pathname } = splitLocalePath(usePathname());

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Quiet text nav; the active page carries a cinnabar marker on the reading
  // edge (left in the sidebar, bottom in the mobile strip).
  const linkClass = (href: string, highlight = false) => {
    const active = isActive(href);
    const base =
      orientation === "vertical"
        ? "flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors"
        : "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm transition-colors";
    if (active) {
      return `${base} border-cinnabar font-medium ${highlight ? "text-cinnabar" : "text-foreground"}`;
    }
    return `${base} border-transparent ${
      highlight
        ? "text-cinnabar hover:text-cinnabar/80"
        : "text-muted-foreground hover:text-foreground"
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
