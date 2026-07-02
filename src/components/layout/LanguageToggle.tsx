"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE } from "@/lib/i18n/dictionaries";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { swapLocalePath } from "@/lib/i18n/routing";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = locale === "zh" ? "en" : "zh";
    // Persist the preference before navigating. The proxy also syncs the
    // cookie to the URL, but its Set-Cookie rides the streamed navigation
    // response — a follow-up unprefixed request could still see the old value.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.push(swapLocalePath(pathname, next));
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={pending}
      aria-label={locale === "zh" ? "Switch to English" : "切换为中文"}
    >
      <Languages className="size-4" aria-hidden />
      {locale === "zh" ? "EN" : "中文"}
    </Button>
  );
}
