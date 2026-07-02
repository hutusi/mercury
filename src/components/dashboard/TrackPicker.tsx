"use client";

import { useState, useTransition } from "react";
import { Briefcase, Check, GraduationCap, Target, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    accent: boolean;
    icon: LucideIcon;
  }[] = [
    {
      track: "toeic",
      label: t.tracks.toeic,
      desc: t.onboarding.toeicDesc,
      badge: t.onboarding.examBadge,
      accent: false,
      icon: Target,
    },
    {
      track: "ielts",
      label: t.tracks.ielts,
      desc: t.onboarding.ieltsDesc,
      badge: t.onboarding.examBadge,
      accent: false,
      icon: GraduationCap,
    },
    {
      track: "business",
      label: t.tracks.business,
      desc: t.onboarding.businessDesc,
      badge: t.onboarding.bizBadge,
      accent: true,
      icon: Briefcase,
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
              className={`border p-6 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active ? "border-foreground" : "border-border hover:border-input"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <o.icon className="size-5" aria-hidden />
                <span className="flex items-center gap-2">
                  {active && <Check className="size-4 text-cinnabar" aria-hidden />}
                  <Badge variant={o.accent ? "accent" : "outline"}>{o.badge}</Badge>
                </span>
              </div>
              <h2 className="mt-4 font-serif text-lg font-medium">{o.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
            </button>
          );
        })}
      </div>
      <div>
        <Button
          onClick={confirm}
          disabled={!selected || pending}
          size="lg"
          className="h-11 px-8 text-base"
        >
          {pending ? t.common.loading : t.onboarding.confirm}
        </Button>
      </div>
    </div>
  );
}
