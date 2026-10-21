import { cn } from "@/lib/utils";

/**
 * Long-form learner-facing prose — reading passages, book chapters, exam
 * passages. Newsreader at ~19px with relaxed leading: its small x-height
 * reads below its nominal size, and extended reading wants the larger measure.
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
        "font-serif text-[1.1875rem] leading-[1.72] text-pretty whitespace-pre-line text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
