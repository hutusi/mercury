import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Daybreak pill buttons. `default` (ink) is the one primary action on a
 * surface; `outline` and `ghost` are everything else. `inverse` sits on the
 * dark feature surface (the mock-exam card). Sizes keep every target at or
 * above 44px except the compact `sm`/`xs` used inside dense rows.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent font-medium whitespace-nowrap transition-colors duration-200 outline-hidden select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.0625rem]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        // Kept for older call sites (the Lexicon's funnel CTA); Daybreak has
        // no coloured primary — it renders as the ink primary.
        accent: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-input bg-transparent text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        inverse: "bg-feature-foreground text-feature hover:bg-badge",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/15",
        link: "rounded-md px-0 text-brand-ink underline-offset-4 hover:text-foreground hover:underline",
      },
      size: {
        default: "min-h-11 px-5 py-2 text-[0.9375rem]",
        xs: "min-h-8 gap-1.5 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "min-h-9 gap-1.5 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-13 px-7 py-3 text-base",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
