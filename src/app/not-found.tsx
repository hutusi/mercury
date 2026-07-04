import "./globals.css";
import { getDict, getLocale } from "@/lib/i18n";

/**
 * Root 404 fallback. Reached for unmatched top-level paths and for the
 * invalid-locale `notFound()` in [locale]/layout.tsx — i.e. before the locale
 * layout renders — so it must supply its own <html>/<body>. Localized from the
 * cookie; a plain anchor is used since the router context isn't mounted here.
 */
export default async function RootNotFound() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            {t.errors.notFoundTitle}
          </h1>
          <p className="mt-4 text-muted-foreground">{t.errors.notFoundBody}</p>
          <a
            href={`/${locale}`}
            className="mt-8 inline-flex w-fit items-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {t.errors.goHome}
          </a>
        </main>
      </body>
    </html>
  );
}
