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
        "rounded-2xl border border-dashed border-input px-5 py-10 text-center text-muted-foreground",
        className,
      )}
    >
      {children}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
