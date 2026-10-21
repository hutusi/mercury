"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { swapLocalePath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

function persistLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

const OPTIONS: { locale: Locale; label: string; switchLabel: string }[] = [
  { locale: "zh", label: "中", switchLabel: "切换为中文" },
  { locale: "en", label: "EN", switchLabel: "Switch to English" },
];

/** 中 | EN pill: interface language. Learning content stays English. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // Persist the preference before navigating. The proxy also syncs the
    // cookie to the URL, but its Set-Cookie rides the streamed navigation
    // response — a follow-up unprefixed request could still see the old value.
    persistLocale(next);
    startTransition(() => {
      router.push(swapLocalePath(pathname, next));
    });
  }

  return (
    <div className={cn("flex shrink-0 gap-0.5 rounded-full bg-track p-[3px]", className)}>
      {OPTIONS.map((option) => {
        const active = option.locale === locale;
        return (
          <button
            key={option.locale}
            type="button"
            lang={option.locale === "zh" ? "zh-CN" : "en"}
            onClick={() => switchTo(option.locale)}
            disabled={pending}
            aria-pressed={active}
            aria-label={option.switchLabel}
            className={cn(
              "h-[1.875rem] min-w-9 rounded-full px-2.5 text-[0.8125rem] leading-none font-medium outline-hidden transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-tab"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
