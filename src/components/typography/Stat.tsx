import { cn } from "@/lib/utils";
import { SectionLabel } from "./SectionLabel";

const SIZES = {
  sm: "text-lg",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-7xl",
} as const;

/** A figure set in the mono data face, optionally captioned and accented. */
export function Stat({
  value,
  unit,
  label,
  accent = false,
  size = "md",
  align = "start",
  className,
}: {
  value: React.ReactNode;
  unit?: string;
  label?: React.ReactNode;
  accent?: boolean;
  /** Figure size; `md` (text-3xl) is the marginalia default. */
  size?: keyof typeof SIZES;
  /** `center` for hero figures; `start` for the left-aligned rail. */
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {label ? <SectionLabel as="span">{label}</SectionLabel> : null}
      <span
        className={cn(
          "font-mono font-semibold tracking-tight tabular-nums",
          SIZES[size],
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
