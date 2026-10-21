"use client";

import { cn } from "@/lib/utils";

/** Pill toggle chip (filters, target scores). Selection is dusk blue. */
export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-10 rounded-full border-[1.5px] px-4 py-1.5 text-sm font-medium whitespace-nowrap tabular-nums outline-hidden transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-brand bg-brand-soft text-brand-ink"
          : "border-input bg-card text-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}
