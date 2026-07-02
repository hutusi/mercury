"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { TRACKS, type Track } from "@/content/types";
import { setActiveTrack } from "@/lib/actions/settings";
import { useT } from "@/lib/i18n/LocaleProvider";

export function TrackSwitcher({ current }: { current: Track }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const track = e.target.value as Track;
    startTransition(async () => {
      await setActiveTrack(track);
      router.refresh();
    });
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={pending}
      aria-label={t.tracks.switchTrack}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 focus:border-brand-500 focus:outline-none disabled:opacity-50"
    >
      {TRACKS.map((track) => (
        <option key={track} value={track}>
          {t.tracks[track]}
        </option>
      ))}
    </select>
  );
}
