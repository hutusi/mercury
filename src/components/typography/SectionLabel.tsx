import { cn } from "@/lib/utils";

/**
 * Section heading: 15px semibold sans, with an optional trailing note
 * (e.g. "tailored to your goal") pushed to the far side. Daybreak has no
 * uppercase micro-labels.
 */
export function SectionLabel({
  as: Tag = "p",
  id,
  className,
  note,
  children,
}: {
  as?: "h2" | "h3" | "p" | "span" | "div";
  id?: string;
  className?: string;
  /** Muted trailing text on the same line. */
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (note) {
    return (
      <div
        className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1", className)}
      >
        <Tag id={id} className="text-[0.9375rem] font-semibold text-foreground">
          {children}
        </Tag>
        <span className="text-[0.8125rem] text-muted-foreground">{note}</span>
      </div>
    );
  }
  return (
    <Tag id={id} className={cn("text-[0.9375rem] font-semibold text-foreground", className)}>
      {children}
    </Tag>
  );
}
