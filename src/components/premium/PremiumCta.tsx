"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * The one door from a quota wall to the premium story. Every surface that
 * tells a learner "you've hit today's limit" renders this next to it — a
 * dead end with no path to more capacity is wasted intent.
 */
export function PremiumCta() {
  const t = useT();
  return (
    <Link
      href="/premium"
      className="inline-block text-sm font-medium text-cinnabar underline underline-offset-4 transition-colors hover:text-cinnabar/80"
    >
      {t.premium.learnMore} →
    </Link>
  );
}
