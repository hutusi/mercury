"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/LocaleProvider";
import { splitLocalePath } from "@/lib/i18n/routing";

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: "🏠" },
  { key: "vocabulary", href: "/vocabulary", icon: "📚" },
  { key: "reading", href: "/reading", icon: "📖" },
  { key: "listening", href: "/listening", icon: "🎧" },
  { key: "writing", href: "/writing", icon: "✍️" },
  { key: "speaking", href: "/speaking", icon: "🎤" },
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
        ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition"
        : "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition";
    if (active) {
      return `${base} ${highlight ? "bg-accent-100 text-accent-700" : "bg-brand-50 text-brand-700"}`;
    }
    return `${base} ${
      highlight
        ? "text-accent-700 hover:bg-accent-50"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  };

  return (
    <>
      {NAV_ITEMS.map((item) => (
        <Link key={item.key} href={item.href} className={linkClass(item.href)}>
          <span aria-hidden>{item.icon}</span>
          {t.nav[item.key]}
        </Link>
      ))}
      {/* Mock exam mode: visually distinct — it is the funnel's centerpiece */}
      <Link href="/exams" className={linkClass("/exams", true)}>
        <span aria-hidden>⏱️</span>
        {t.nav.exams}
      </Link>
    </>
  );
}
