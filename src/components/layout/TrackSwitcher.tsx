"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  // Gate the select on the action round-trip only; refreshing the tree runs
  // in its own transition so a slow apply can't wedge the control (see the
  // note in src/lib/actions/settings.ts).
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  async function handleChange(track: string) {
    setPending(true);
    try {
      await setActiveTrack(track as Track);
      startTransition(() => router.refresh());
    } catch (error) {
      // The Select reflects the server prop, so there is nothing to revert —
      // just keep a failed action from becoming an unhandled rejection.
      console.error("track switch failed", error);
    } finally {
      setPending(false);
    }
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
