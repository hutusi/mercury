import { Check } from "lucide-react";
import type { StopStatus } from "@/lib/plan-status-core";
import { cn } from "@/lib/utils";

/**
 * A stop on the route: a filled dusk-blue check when done, a blue ring with
 * its number when current, a quiet ring otherwise — the same shape as the
 * station-node wordmark.
 */
export function RouteNode({
  status,
  number,
  size = "md",
  className,
}: {
  status: StopStatus;
  number: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 font-semibold tabular-nums transition-colors duration-300",
        size === "md" ? "size-7 text-xs" : "size-6 text-[0.6875rem]",
        status === "done"
          ? "border-brand bg-brand text-brand-foreground"
          : status === "current"
            ? "border-brand bg-card text-brand-ink"
            : "border-input text-muted-foreground",
        className,
      )}
    >
      {status === "done" ? (
        <Check
          className={size === "md" ? "size-[0.9375rem]" : "size-[0.8125rem]"}
          strokeWidth={3}
        />
      ) : (
        number
      )}
    </span>
  );
}
