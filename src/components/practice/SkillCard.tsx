import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { cn } from "@/lib/utils";

/**
 * One skill on the Practice hub: what it is, where the learner stands
 * (a progress line), and the learner model's estimate as a bar — coral when
 * it is the weakest skill, so the eye lands where the plan would send it.
 */
export function SkillCard({
  href,
  icon: Icon,
  name,
  meta,
  weakLabel,
  level,
}: {
  href: string;
  icon: LucideIcon;
  name: string;
  meta: string;
  /** Present when this is the weakest measured skill. */
  weakLabel?: string;
  level?: { label: string; value: number };
}) {
  const weak = Boolean(weakLabel);
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5 outline-hidden transition-[border-color,box-shadow] duration-200 hover:border-brand-border hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex w-full items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-soft-3">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 font-serif text-[1.1875rem] leading-snug font-medium">
          {name}
        </span>
        {weakLabel ? <Badge variant="coral">{weakLabel}</Badge> : null}
      </div>
      <p className="text-[0.8125rem] text-muted-foreground">{meta}</p>
      {level ? (
        <div className="w-full">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>{level.label}</span>
            <span className="tabular-nums">{level.value}</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-track">
            <div
              className={cn("h-full rounded-full", weak ? "bg-coral" : "bg-brand")}
              style={{ width: `${Math.max(0, Math.min(100, level.value))}%` }}
            />
          </div>
        </div>
      ) : null}
    </Link>
  );
}
