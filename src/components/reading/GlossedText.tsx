"use client";

import { useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { buildGlossPattern, segmentGlossText, type GlossEntry } from "@/lib/gloss-core";

/**
 * Passage text with today's reviewed words underlined in dotted dusk blue;
 * tapping one shows its gloss as a toast. With no glosses (a fresh learner,
 * or nothing reviewed today) the output is the plain text, unchanged.
 */
export function GlossedText({ text, glosses }: { text: string; glosses: readonly GlossEntry[] }) {
  const toast = useToast();
  const byId = useMemo(() => new Map(glosses.map((g) => [g.wordId, g])), [glosses]);
  const segments = useMemo(
    () => segmentGlossText(text, buildGlossPattern(glosses)),
    [text, glosses],
  );

  return segments.map((segment, i) => {
    if (typeof segment === "string") return segment;
    const gloss = byId.get(segment.wordId);
    if (!gloss) return segment.text;
    return (
      <button
        key={i}
        type="button"
        onClick={() => toast.show(`${gloss.headword} ${gloss.ipa}`, gloss.translationZh)}
        className="inline cursor-pointer rounded-none border-b-2 border-dotted border-brand p-0 text-left font-[inherit] text-inherit outline-hidden focus-visible:bg-brand-soft"
      >
        {segment.text}
      </button>
    );
  });
}

/** Whether any of today's words appear in the text (for the legend). */
export function hasGlossMatches(text: string, glosses: readonly GlossEntry[]): boolean {
  return segmentGlossText(text, buildGlossPattern(glosses)).some((s) => typeof s !== "string");
}
