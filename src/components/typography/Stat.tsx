import { cn } from "@/lib/utils";
import { SectionLabel } from "./SectionLabel";

/** A figure set in the mono data face, optionally captioned and accented. */
export function Stat({
  value,
  unit,
  label,
  accent = false,
  className,
}: {
  value: React.ReactNode;
  unit?: string;
  label?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? <SectionLabel as="span">{label}</SectionLabel> : null}
      <span
        className={cn(
          "font-mono text-3xl font-semibold tracking-tight tabular-nums",
          accent && "text-cinnabar",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 font-sans text-sm font-medium text-muted-foreground">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}
