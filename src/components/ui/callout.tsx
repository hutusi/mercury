import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The Lexicon's one bordered-notice primitive, replacing the callout box that
 * was hand-rolled across the app. `accent` is the cinnabar funnel/self-assess
 * tint, `error` the destructive tint, `muted` a quiet paper fill. Padding and
 * text size stay with the caller (via className) so each site keeps its rhythm.
 */
const calloutVariants = cva("border", {
  variants: {
    variant: {
      accent: "border-cinnabar/30 bg-cinnabar/5",
      error: "border-destructive/20 bg-destructive/10 text-destructive",
      muted: "border-border bg-muted",
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
