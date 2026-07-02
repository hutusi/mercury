import { cn } from "@/lib/utils";

/** Mono micro-label for section headings, table heads, and stat captions. */
export function SectionLabel({
  as: Tag = "p",
  className,
  children,
}: {
  as?: "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
