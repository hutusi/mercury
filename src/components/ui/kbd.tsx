import { cn } from "@/lib/utils";

/** A keyboard-shortcut key cap, shown only where a keyboard is likely. */
export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-6 items-center justify-center rounded-sm bg-kbd px-1.5 py-0.5 font-sans text-xs font-medium text-kbd-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
