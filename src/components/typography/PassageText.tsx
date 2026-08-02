import { cn } from "@/lib/utils";

/**
 * Long-form learner-facing prose — reading passages, book chapters, exam
 * passages. Serif at 18px: the default 16px Newsreader reads smaller than its
 * nominal size, and extended reading wants the larger measure.
 */
export function PassageText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-serif text-lg leading-relaxed whitespace-pre-line text-foreground/90",
        className,
      )}
    >
      {children}
    </div>
  );
}
