import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-xl",
  md: "text-[2.125rem]",
  lg: "text-5xl",
  xl: "text-7xl",
} as const;

/** A serif figure with an optional caption above and unit beside it. */
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
  /** Coral figure — the streak. */
  accent?: boolean;
  size?: keyof typeof SIZES;
  /** `center` for hero figures; `start` for the side rail. */
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {label ? <span className="text-[0.8125rem] text-muted-foreground">{label}</span> : null}
      <span
        className={cn(
          "font-serif leading-none font-medium tabular-nums",
          SIZES[size],
          accent && "text-coral",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}
