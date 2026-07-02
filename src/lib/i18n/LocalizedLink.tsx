"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";
import { localePath } from "./routing";

type LocalizedLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * next/link that prefixes the href with the current locale segment, so call
 * sites keep writing unprefixed app paths ("/dashboard").
 */
export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const locale = useLocale();
  return <Link href={localePath(locale, href)} {...props} />;
}
