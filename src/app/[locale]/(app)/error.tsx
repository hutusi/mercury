"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/layout/ErrorState";

/**
 * Error boundary for the authenticated app. Renders inside the AppShell, so
 * the sidebar and nav survive a page-level throw instead of the whole app
 * collapsing to Next's default error screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console/monitoring; `digest` ties this to the server log.
    console.error(error);
  }, [error]);

  return <ErrorState reset={reset} />;
}
