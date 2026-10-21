import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Small pill labels. Colour carries meaning: `accent` (dusk blue) for "new"
 * and progress, `coral` for mistakes and the weakest-skill flag, everything
 * else neutral. Sentence case — Daybreak has no uppercase micro-labels.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-xs leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-track text-soft-2",
        accent: "bg-brand-soft text-brand-ink",
        coral: "bg-coral-soft text-coral-ink",
        secondary: "bg-muted text-muted-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border-input text-foreground",
        ghost: "text-muted-foreground",
        link: "text-brand-ink underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
