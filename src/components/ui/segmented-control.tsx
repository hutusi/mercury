"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/**
 * A row of mutually exclusive options on a recessed track (theme, minutes per
 * day, passage/questions, active/cleared). A radiogroup: one tab stop, arrow
 * keys move the selection, the chosen segment lifts onto the surface.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  size = "md",
  fill = false,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
  size?: "sm" | "md";
  /** Stretch segments to fill the width equally. */
  fill?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("gap-1 rounded-lg bg-track p-1", fill ? "grid" : "inline-flex", className)}
      style={
        fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined
      }
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3.5 font-medium whitespace-nowrap tabular-nums outline-hidden transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "min-h-9 text-[0.8125rem]" : "min-h-10 text-sm",
              selected
                ? "bg-card text-foreground shadow-tab"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
