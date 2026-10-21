import { cn } from "@/lib/utils";

/** The learner's initial on a soft dusk-blue disc. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "·";
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-avatar font-serif text-[0.9375rem] font-semibold text-avatar-foreground",
        className,
      )}
    >
      {initial}
    </span>
  );
}
