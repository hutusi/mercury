import { cn } from "@/lib/utils";

/**
 * The station node — the brand mark is the same shape as every stop on the
 * day's route — beside the serif name.
 */
export function StationNode({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[1.625rem] shrink-0 items-center justify-center rounded-full border-[1.5px] border-brand",
        className,
      )}
    >
      <span className="size-2.5 rounded-full bg-brand" />
    </span>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <StationNode className={compact ? "size-6" : undefined} />
      <span
        className={cn(
          "font-serif leading-none font-semibold tracking-[-0.01em]",
          compact ? "text-[1.1875rem]" : "text-[1.3125rem]",
        )}
      >
        Mercury
      </span>
    </span>
  );
}
