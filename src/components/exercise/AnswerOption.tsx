"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type OptionState = "idle" | "picked" | "correct" | "wrong" | "muted";

/** Options re-flow from one column on phones to two or more on wide cards. */
export const OPTION_GRID = "grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-2";

/**
 * One option of an instantly graded question (notebook retests, book
 * check-ins): picked in dusk blue while grading, then the key in dusk blue
 * with a check and a wrong pick struck through in coral.
 */
export function AnswerOption({
  letter,
  state,
  disabled,
  onClick,
  children,
}: {
  letter?: string;
  state: OptionState;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const marked = state === "correct" || state === "picked";
  return (
    <button
      type="button"
      data-option-state={state}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[2.875rem] items-center gap-2.5 rounded-md border-[1.5px] px-3 py-2 text-left text-sm leading-[1.4] outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
        marked
          ? "border-brand bg-brand-soft"
          : state === "wrong"
            ? "border-coral bg-coral-soft text-muted-foreground"
            : state === "muted"
              ? "border-border bg-card text-muted-foreground"
              : "border-border bg-card hover:border-input hover:bg-muted",
        disabled && "cursor-default",
      )}
    >
      {letter ? (
        <span
          aria-hidden
          className={cn(
            "flex size-[1.375rem] shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            marked
              ? "bg-brand text-brand-foreground"
              : state === "wrong"
                ? "bg-coral text-coral-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          {letter}
        </span>
      ) : null}
      <span className={cn("flex-1", state === "wrong" && "line-through")}>{children}</span>
      {state === "correct" ? <Check className="size-4 shrink-0 text-brand" aria-hidden /> : null}
      {state === "wrong" ? <X className="size-4 shrink-0 text-coral" aria-hidden /> : null}
    </button>
  );
}
