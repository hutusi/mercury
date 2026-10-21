"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/layout/ErrorState";

/**
 * Last-resort boundary for the authenticated area: catches errors thrown by
 * the (shell)/(flow) group layouts themselves, so it renders without chrome.
 * Page-level errors are caught by each group's own error.tsx first.
 */
export default function AppError({
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
    <main id="main-content" className="mx-auto max-w-xl px-4 py-16">
      <ErrorState reset={reset} />
    </main>
  );
}
