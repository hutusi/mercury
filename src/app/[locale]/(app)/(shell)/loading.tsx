import { PageSkeleton } from "@/components/layout/PageSkeleton";

/**
 * Shared Suspense fallback for every authenticated route. Renders inside the
 * AppShell, so navigating between pages shows a hairline skeleton in the
 * content area instead of a blank wait while the server page's queries run.
 */
export default function Loading() {
  return <PageSkeleton />;
}
