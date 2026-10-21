import "./globals.css";
import { dictionaries } from "@/lib/i18n/dictionaries";

/**
 * Root 404 fallback. Reached for unmatched top-level paths and for the
 * invalid-locale `notFound()` in [locale]/layout.tsx — i.e. before the locale
 * layout renders — so it must supply its own <html>/<body>.
 *
 * Deliberately static and bilingual (like global-error.tsx): this boundary is
 * part of EVERY route's tree, so reading the locale cookie here made every
 * page in the app dynamic, the public landing page included. A plain anchor
 * is used since the router context isn't mounted here.
 */
export default function RootNotFound() {
  const { zh, en } = dictionaries;
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
          <h1 className="font-serif text-4xl font-medium">{zh.errors.notFoundTitle}</h1>
          <p className="mt-2 font-serif text-2xl text-muted-foreground" lang="en">
            {en.errors.notFoundTitle}
          </p>
          <p className="mt-6 text-muted-foreground">{zh.errors.notFoundBody}</p>
          <p className="mt-1 text-muted-foreground" lang="en">
            {en.errors.notFoundBody}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {/* Plain anchors: the router context isn't mounted above the
                [locale] layout, where this boundary renders. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
            <a
              href="/zh"
              className="inline-flex min-h-11 w-fit items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {zh.errors.goHome}
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
            <a
              href="/en"
              lang="en"
              className="inline-flex min-h-11 w-fit items-center rounded-full border border-input px-5 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              {en.errors.goHome}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
