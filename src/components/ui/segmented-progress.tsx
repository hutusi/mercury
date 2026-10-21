import { cn } from "@/lib/utils";

export type SegmentTone = "done" | "current" | "skipped" | "open";

const TONES: Record<SegmentTone, string> = {
  done: "bg-brand",
  current: "bg-brand-mid",
  skipped: "bg-input",
  open: "bg-border",
};

/**
 * The route bar: one pill segment per stop, sized by its estimated minutes,
 * coloured by status. Used under the Today header, in the sidebar plan card,
 * and in the session top bar.
 */
export function SegmentedProgress({
  segments,
  className,
  label,
}: {
  segments: readonly { weight: number; tone: SegmentTone }[];
  className?: string;
  /** Accessible summary, e.g. "2 / 4". The bar itself is decorative. */
  label?: string;
}) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("flex h-1.5 gap-1", className)}
    >
      {segments.map((segment, i) => (
        <div
          key={i}
          className={cn("rounded-full transition-colors duration-300", TONES[segment.tone])}
          style={{ flexGrow: Math.max(segment.weight, 1), flexBasis: 0 }}
        />
      ))}
    </div>
  );
}
