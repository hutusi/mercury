import { cn } from "@/lib/utils";

export function EmptyState({
  className,
  children,
  action,
}: {
  className?: string;
  children: React.ReactNode;
  /** Escape hatch — an empty state must never dead-end (e.g. lift a filter). */
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-y border-border py-12 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
