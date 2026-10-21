import { cn } from "@/lib/utils";

const WIDTHS = {
  narrow: "max-w-[37.5rem]",
  medium: "max-w-[47.5rem]",
  wide: "max-w-[72.5rem]",
} as const;

/** The session page body under the FlowHeader: centred, comfortable gutters. */
export function FlowBody({
  width = "medium",
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("mx-auto w-full px-4 pt-6 pb-16 sm:px-8 sm:pt-10", WIDTHS[width], className)}
    >
      {children}
    </div>
  );
}
