"use client";

import "./globals.css";
import { useEffect } from "react";

/**
 * Last-resort boundary: only fires when the root layout itself throws, so it
 * replaces the entire document and cannot rely on LocaleProvider. Copy is
 * therefore static and bilingual.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
          <div>
            <h1 className="font-serif text-4xl font-medium">Something went wrong</h1>
            <p className="mt-3 text-muted-foreground">出错了 —— The app hit an unexpected error.</p>
          </div>
          <button
            onClick={reset}
            className="inline-flex min-h-11 w-fit items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Try again · 重试
          </button>
        </main>
      </body>
    </html>
  );
}
