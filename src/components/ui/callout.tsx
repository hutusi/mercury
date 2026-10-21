import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The one notice primitive. `accent` is the dusk-blue info tint (coach notes,
 * legends, "new"), `coral` the mistakes/streak tint, `error` the destructive
 * tint for failures, `muted` a quiet sunken fill. Padding and text size stay
 * with the caller (via className) so each site keeps its rhythm.
 */
const calloutVariants = cva("rounded-xl", {
  variants: {
    variant: {
      accent: "bg-brand-soft text-brand-ink-2",
      coral: "bg-coral-soft text-coral-ink-2",
      error: "bg-destructive/10 text-destructive",
      muted: "bg-muted text-soft-3",
    },
  },
  defaultVariants: { variant: "muted" },
});

export function Callout({
  variant,
  className,
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
  // The error variant carries dynamically-appearing async failures, so default
  // it to an alert live region — assistive tech otherwise misses them. Callers
  // can still override via `role`.
  return (
    <div
      role={role ?? (variant === "error" ? "alert" : undefined)}
      className={cn(calloutVariants({ variant }), className)}
      {...props}
    />
  );
}
