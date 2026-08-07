"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { MessageCircleQuestion, Quote, Send, X } from "lucide-react";
import { SelectionQuoteButton } from "@/components/books/SelectionQuoteButton";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Textarea } from "@/components/ui/textarea";
import { sendBookChatMessage } from "@/lib/actions/book-chat";
import { mapSendErrorToPanelState } from "@/lib/book-chat-core";
import { useT } from "@/lib/i18n/LocaleProvider";

export interface BookChatMessageVM {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * The premium book tutor (ADR 0030): a corner toggle plus a docked chat
 * panel over the reader — bottom sheet on mobile, fixed dock on desktop.
 * Rendered only for entitled users with AI enabled (the server page gates
 * the prop), and only in the reading mode branch, so quiz mode unmounts it.
 * A selected quote rides the message content as a 「…」 prefix line — one
 * string end to end, no separate field to persist.
 */
export function BookTutorDock({
  bookId,
  chapterId,
  proseRef,
  initialMessages,
  remainingToday,
  dailyLimit,
}: {
  bookId: string;
  chapterId: string;
  proseRef: React.RefObject<HTMLDivElement | null>;
  initialMessages: BookChatMessageVM[];
  remainingToday: number;
  dailyLimit: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<string | null>(null);
  const [messages, setMessages] = useState<BookChatMessageVM[]>(initialMessages);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(remainingToday);
  // Quota exhaustion must be legible when the panel opens, not only after a
  // failed send. `enabled` needs no seed — the gate guarantees it; a key
  // breaking mid-session still surfaces as "unavailable" at send time.
  const [error, setError] = useState<"unavailable" | "limit" | "in_progress" | "failed" | null>(
    remainingToday <= 0 ? "limit" : null,
  );
  const [pending, startTransition] = useTransition();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  // Escape must work wherever focus sits — a disabled Send button moves focus
  // to <body>, which a container onKeyDown would never see.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Scroll the panel's own list, never the page (scrollIntoView could);
  // layout-effect so opening paints already scrolled to the newest turn.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, pending, open]);

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  const canSend = remaining > 0 && !pending && input.trim().length > 0;

  function send() {
    if (!canSend) return;
    const question = input.trim();
    const quoted = quote;
    // One string end to end; the server caps content at 4000.
    const content = (quoted ? `「${quoted}」\n${question}` : question).slice(0, 4000);
    setInput("");
    setQuote(null);
    setError(null);
    setMessages((m) => [...m, { id: `local-${m.length}`, role: "user", content }]);
    // Functional restores: never clobber text or a quote the user produced
    // while the reply was in flight (the composer stays enabled).
    const rollback = (error: string) => {
      setMessages((m) => m.slice(0, -1));
      setInput((current) => current || question);
      setQuote((current) => current ?? quoted);
      setError(mapSendErrorToPanelState(error));
      if (error === "limit_reached") setRemaining(0);
    };
    startTransition(async () => {
      try {
        const result = await sendBookChatMessage({ bookId, chapterId, content });
        if (result.ok) {
          setMessages((m) => [
            ...m,
            { id: result.message.id, role: "assistant", content: result.message.content },
          ]);
          setRemaining(result.remainingToday);
          if (result.remainingToday <= 0) setError("limit");
        } else {
          rollback(result.error);
        }
      } catch {
        // Throws outside the union (network failure, or server errors the
        // action deliberately rethrows) degrade to the failed state instead
        // of stranding the optimistic bubble.
        rollback("unexpected");
      }
      // Sending disables the Send button, which strands focus on <body> —
      // return it to the composer either way.
      textareaRef.current?.focus();
    });
  }

  return (
    <>
      <SelectionQuoteButton
        containerRef={proseRef}
        onQuote={(q) => {
          setQuote(q);
          setOpen(true);
          textareaRef.current?.focus();
        }}
      />

      <Button
        ref={toggleRef}
        variant="outline"
        size="icon-lg"
        className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
        aria-label={t.bookChat.openLabel}
        aria-expanded={open}
        aria-controls={open ? "book-tutor-panel" : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <MessageCircleQuestion aria-hidden />
      </Button>

      {open && (
        <div
          id="book-tutor-panel"
          role="dialog"
          aria-labelledby="book-tutor-title"
          className="fixed inset-x-0 bottom-0 z-40 flex max-h-[70dvh] flex-col border border-border bg-background sm:inset-x-auto sm:right-6 sm:bottom-20 sm:h-[520px] sm:max-h-[calc(100dvh-7rem)] sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <SectionLabel as="h2" id="book-tutor-title">
              {t.bookChat.title}
            </SectionLabel>
            <div className="flex items-center gap-2">
              <p
                id="book-tutor-message-meta"
                className="font-mono text-xs text-muted-foreground tabular-nums"
              >
                {t.tutor.remainingLabel}: {remaining} / {dailyLimit}
              </p>
              <Button variant="ghost" size="icon-sm" aria-label={t.bookChat.close} onClick={close}>
                <X aria-hidden />
              </Button>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.length === 0 && !pending && (
              <p className="text-sm text-muted-foreground">{t.bookChat.emptyHint}</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "border-l-2 border-border pl-3" : ""}>
                <SectionLabel as="p" className="mb-1">
                  {m.role === "user" ? t.tutor.youLabel : t.tutor.coachLabel}
                </SectionLabel>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {pending && (
              <p role="status" className="text-sm text-muted-foreground">
                {t.tutor.thinking}
              </p>
            )}
          </div>

          {error === "unavailable" && (
            <Callout variant="accent" role="alert" className="mx-4 mb-3 p-3 text-xs">
              {t.tutor.unavailable}
            </Callout>
          )}
          {error === "limit" && (
            <Callout variant="accent" role="alert" className="mx-4 mb-3 p-3 text-xs">
              {t.tutor.limitReached}
            </Callout>
          )}
          {error === "in_progress" && (
            <Callout variant="accent" role="status" className="mx-4 mb-3 p-3 text-xs">
              {t.tutor.inProgress}
            </Callout>
          )}
          {error === "failed" && (
            <Callout variant="error" className="mx-4 mb-3 p-3 text-xs">
              {t.tutor.sendFailed}
            </Callout>
          )}

          <div className="space-y-2 border-t border-border p-3">
            {quote && (
              <div className="flex items-start gap-2 border border-border bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-2 min-w-0 flex-1">{quote}</span>
                <button
                  type="button"
                  className="shrink-0 transition-colors hover:text-foreground"
                  aria-label={t.bookChat.removeQuote}
                  onClick={() => setQuote(null)}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            )}
            <label htmlFor="book-tutor-message" className="sr-only">
              {t.tutor.messageLabel}
            </label>
            <Textarea
              ref={textareaRef}
              id="book-tutor-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t.bookChat.placeholder}
              rows={2}
              maxLength={3600}
              disabled={remaining <= 0 || error === "unavailable"}
              aria-describedby="book-tutor-message-meta"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={send} disabled={!canSend}>
                <Send aria-hidden />
                {t.tutor.send}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
