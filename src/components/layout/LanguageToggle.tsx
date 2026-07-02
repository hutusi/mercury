"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setLocale(locale === "zh" ? "en" : "zh");
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={locale === "zh" ? "Switch to English" : "切换为中文"}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {locale === "zh" ? "EN" : "中文"}
    </button>
  );
}
