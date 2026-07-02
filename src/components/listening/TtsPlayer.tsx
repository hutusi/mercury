"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ScriptLine } from "@/content/types";
import { useT } from "@/lib/i18n/LocaleProvider";
import { createScriptSpeaker, ttsSupported, type ScriptSpeaker } from "@/lib/speech";

export function TtsPlayer({ script }: { script: ScriptLine[] }) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lineIndex, setLineIndex] = useState(-1);
  const [playCount, setPlayCount] = useState(0);
  const speakerRef = useRef<ScriptSpeaker | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mounted-gate: speech APIs only exist client-side
    setMounted(true);
    return () => speakerRef.current?.stop();
  }, []);

  if (!mounted) return null;

  if (!ttsSupported()) {
    return (
      <div className="border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {t.listening.ttsUnsupported}
      </div>
    );
  }

  function play() {
    speakerRef.current?.stop();
    const speaker = createScriptSpeaker(script, {
      onLineChange: setLineIndex,
      onEnd: () => {
        setPlaying(false);
        setLineIndex(-1);
      },
    });
    speakerRef.current = speaker;
    setPlaying(true);
    setPlayCount((n) => n + 1);
    speaker.play();
  }

  function stop() {
    speakerRef.current?.stop();
    setPlaying(false);
    setLineIndex(-1);
  }

  const progress = playing && lineIndex >= 0 ? ((lineIndex + 1) / script.length) * 100 : 0;

  return (
    <div className="border border-border p-5">
      <div className="flex items-center gap-4">
        <button
          onClick={playing ? stop : play}
          className={`flex h-12 w-12 shrink-0 items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            playing
              ? "bg-cinnabar text-cinnabar-foreground hover:bg-cinnabar/90"
              : "bg-primary text-primary-foreground hover:bg-primary/85"
          }`}
          aria-label={playing ? t.listening.pause : t.listening.play}
        >
          <span aria-hidden>
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </span>
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground/80">
            {playing ? t.listening.playing : playCount > 0 ? t.listening.replay : t.listening.play}
          </p>
          <div className="mt-2 h-1 overflow-hidden bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground/70">{t.listening.listenFirst}</p>
    </div>
  );
}
