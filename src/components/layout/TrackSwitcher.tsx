"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRACKS, type Track } from "@/content/types";
import { setActiveTrack } from "@/lib/actions/settings";
import { useT } from "@/lib/i18n/LocaleProvider";

export function TrackSwitcher({ current }: { current: Track }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(track: string) {
    startTransition(async () => {
      await setActiveTrack(track as Track);
      router.refresh();
    });
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger size="sm" aria-label={t.tracks.switchTrack}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {TRACKS.map((track) => (
          <SelectItem key={track} value={track}>
            {t.tracks[track]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
