"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Component, useTransition, type ReactNode } from "react";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * Card-level error boundary for a streamed section. Without it, a failure in
 * one Suspense-streamed block (the daily plan's fan-out, say) escalates to the
 * route boundary and replaces the whole page — streak, due words and all —
 * with an error screen. The fallback keeps the rest of the page usable and
 * offers a retry that re-renders the server tree.
 */
export class SectionErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Section failed to render", error);
  }

  render() {
    if (this.state.failed) {
      return <SectionErrorFallback reset={() => this.setState({ failed: false })} />;
    }
    return this.props.children;
  }
}

function SectionErrorFallback({ reset }: { reset: () => void }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Callout variant="error" className="flex flex-wrap items-center justify-between gap-3 p-4">
      <span className="text-sm">{t.errors.sectionFailed}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      >
        <RotateCcw className="size-4" aria-hidden />
        {t.common.tryAgain}
      </Button>
    </Callout>
  );
}
