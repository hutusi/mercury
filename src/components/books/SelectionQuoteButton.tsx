"use client";

import { useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";
import { clampQuote } from "@/lib/book-chat-core";
import { useT } from "@/lib/i18n/LocaleProvider";

interface SelectionState {
  top: number;
  left: number;
  quote: string;
}

/**
 * The text-selection entry point for the book tutor: selecting prose inside
 * the container shows a small "ask the tutor" button under the selection.
 * The quote is cached when the button appears — the click never depends on
 * the (fragile) live selection — and dismissal is deliberately eager: any
 * scroll or Escape hides it. This is an enhancement; the dock's corner
 * button is the reliable entry.
 */
export function SelectionQuoteButton({
  containerRef,
  onQuote,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  onQuote: (quote: string) => void;
}) {
  const t = useT();
  const [state, setState] = useState<SelectionState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Debounced: iOS Safari fires selectionchange continuously while the
    // selection handles are dragged.
    function onSelectionChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const container = containerRef.current;
        const selection = document.getSelection();
        if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
          setState(null);
          return;
        }
        const { anchorNode, focusNode } = selection;
        if (!anchorNode || !focusNode) return setState(null);
        if (!container.contains(anchorNode) || !container.contains(focusNode)) {
          setState(null);
          return;
        }
        const quote = clampQuote(selection.toString());
        if (!quote) return setState(null);
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        // Below the selection (the iOS native callout sits above it), center
        // clamped to the viewport.
        setState({
          top: rect.bottom + 8,
          left: Math.min(Math.max(rect.left + rect.width / 2, 72), window.innerWidth - 72),
          quote,
        });
      }, 200);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [containerRef]);

  useEffect(() => {
    if (!state) return;
    const hide = () => setState(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [state]);

  if (!state) return null;

  return (
    <button
      type="button"
      style={{ top: state.top, left: state.left }}
      className="fixed z-40 inline-flex -translate-x-1/2 items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      // Keep the click from collapsing the selection before the handler runs.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onQuote(state.quote);
        setState(null);
      }}
    >
      <Quote className="size-3.5" aria-hidden />
      {t.bookChat.askSelection}
    </button>
  );
}
