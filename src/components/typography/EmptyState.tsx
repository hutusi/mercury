import { cn } from "@/lib/utils";

export function EmptyState({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-y border-border py-12 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
