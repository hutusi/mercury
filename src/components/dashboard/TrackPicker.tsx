"use client";

import { useState, useTransition } from "react";
import type { Track } from "@/content/types";
import { completeOnboarding } from "@/lib/actions/settings";
import { useT } from "@/lib/i18n/LocaleProvider";

export function TrackPicker() {
  const t = useT();
  const [selected, setSelected] = useState<Track | null>(null);
  const [pending, startTransition] = useTransition();

  const options: { track: Track; label: string; desc: string; badge: string; icon: string }[] = [
    {
      track: "toeic",
      label: t.tracks.toeic,
      desc: t.onboarding.toeicDesc,
      badge: t.onboarding.examBadge,
      icon: "🎯",
    },
    {
      track: "ielts",
      label: t.tracks.ielts,
      desc: t.onboarding.ieltsDesc,
      badge: t.onboarding.examBadge,
      icon: "🎓",
    },
    {
      track: "business",
      label: t.tracks.business,
      desc: t.onboarding.businessDesc,
      badge: t.onboarding.bizBadge,
      icon: "💼",
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
              className={`rounded-xl border-2 bg-white p-6 text-left transition ${
                active
                  ? "border-brand-600 shadow-md ring-2 ring-brand-200"
                  : "border-slate-200 shadow-sm hover:border-brand-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden>
                  {o.icon}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    o.badge === t.onboarding.examBadge
                      ? "bg-brand-50 text-brand-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {o.badge}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{o.label}</h2>
              <p className="mt-1 text-sm text-slate-600">{o.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <button
          onClick={confirm}
          disabled={!selected || pending}
          className="rounded-lg bg-brand-600 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? t.common.loading : t.onboarding.confirm}
        </button>
      </div>
    </div>
  );
}
