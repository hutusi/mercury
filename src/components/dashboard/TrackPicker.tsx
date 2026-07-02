"use client";

import { useState, useTransition } from "react";
import { Briefcase, GraduationCap, Target, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Track } from "@/content/types";
import { completeOnboarding } from "@/lib/actions/settings";
import { useT } from "@/lib/i18n/LocaleProvider";

export function TrackPicker() {
  const t = useT();
  const [selected, setSelected] = useState<Track | null>(null);
  const [pending, startTransition] = useTransition();

  const options: {
    track: Track;
    label: string;
    desc: string;
    badge: string;
    icon: LucideIcon;
    iconClass: string;
  }[] = [
    {
      track: "toeic",
      label: t.tracks.toeic,
      desc: t.onboarding.toeicDesc,
      badge: t.onboarding.examBadge,
      icon: Target,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      track: "ielts",
      label: t.tracks.ielts,
      desc: t.onboarding.ieltsDesc,
      badge: t.onboarding.examBadge,
      icon: GraduationCap,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      track: "business",
      label: t.tracks.business,
      desc: t.onboarding.businessDesc,
      badge: t.onboarding.bizBadge,
      icon: Briefcase,
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  function confirm() {
    if (!selected) return;
    startTransition(async () => {
      await completeOnboarding(selected);
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {options.map((o) => {
          const active = selected === o.track;
          return (
            <button
              key={o.track}
              onClick={() => setSelected(o.track)}
              aria-pressed={active}
              className={`rounded-xl border-2 bg-card p-6 text-left transition ${
                active
                  ? "border-primary shadow-md ring-2 ring-primary/20"
                  : "shadow-xs hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${o.iconClass}`}
                  aria-hidden
                >
                  <o.icon className="size-5" />
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    o.badge === t.onboarding.examBadge
                      ? "bg-primary/10 text-primary"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300"
                  }`}
                >
                  {o.badge}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold">{o.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <Button
          onClick={confirm}
          disabled={!selected || pending}
          size="lg"
          className="h-11 px-8 text-base font-semibold"
        >
          {pending ? t.common.loading : t.onboarding.confirm}
        </Button>
      </div>
    </div>
  );
}
