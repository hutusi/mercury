"use client";

/** Bordered toggle chip shared by onboarding and the settings goal editor. */
export function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-4 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active ? "border-foreground" : "border-border hover:border-input"
      } ${className}`}
    >
      {children}
    </button>
  );
}
