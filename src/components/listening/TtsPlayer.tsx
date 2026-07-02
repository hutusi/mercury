"use client";

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
    setMounted(true);
    return () => speakerRef.current?.stop();
  }, []);

  if (!mounted) return null;

  if (!ttsSupported()) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={playing ? stop : play}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl text-white transition ${
            playing ? "bg-red-500 hover:bg-red-600" : "bg-brand-600 hover:bg-brand-700"
          }`}
          aria-label={playing ? t.listening.pause : t.listening.play}
        >
          <span aria-hidden>{playing ? "⏹" : "▶️"}</span>
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">
            {playing ? t.listening.playing : playCount > 0 ? t.listening.replay : t.listening.play}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{t.listening.listenFirst}</p>
    </div>
  );
}
