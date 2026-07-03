"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/layout/ErrorState";

/**
 * Error boundary for the public/auth area (landing, login, register,
 * onboarding) and for failures in the (app) layout itself. Renders inside
 * LocaleProvider — so it is localized — but outside the AppShell, hence the
 * standalone centered frame.
 */
export default function LocaleError({
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
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <ErrorState reset={reset} />
    </div>
  );
}
