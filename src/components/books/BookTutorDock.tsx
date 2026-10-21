"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, MessageCircleQuestion, Quote, X } from "lucide-react";
import { SelectionQuoteButton } from "@/components/books/SelectionQuoteButton";
import { StationNode } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { sendBookChatMessage } from "@/lib/actions/book-chat";
import { mapSendErrorToPanelState } from "@/lib/book-chat-core";
import { restoreUnsent } from "@/lib/drafts";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

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

  // "unavailable" disables the composer, so Send must go dark with it — a
  // restored draft would otherwise allow resubmitting into a dead provider.
  // A quote alone is sendable: 「…」 by itself asks the tutor to explain the
  // passage (the system prompt defines that reading).
  const canSend =
    remaining > 0 &&
    !pending &&
    error !== "unavailable" &&
    (input.trim().length > 0 || quote !== null);

  function send() {
    if (!canSend) return;
    const question = input.trim();
    const quoted = quote;
    // One string end to end; the server caps content at 4000 UTF-16 units.
    // The quote yields first so the user's own words are never dropped — only
    // reachable when astral characters make the quote's UTF-16 length exceed
    // its code-point budget (the trailing replace drops a split surrogate).
    const room = 4000 - question.length - 3; // 「」 + newline
    const clippedQuote =
      quoted && room > 0 ? quoted.slice(0, room).replace(/[\uD800-\uDBFF]$/, "") : null;
    const content = clippedQuote
      ? question
        ? `「${clippedQuote}」\n${question}`
        : `「${clippedQuote}」`
      : question;
    setInput("");
    setQuote(null);
    setError(null);
    setMessages((m) => [...m, { id: `local-${m.length}`, role: "user", content }]);
    // Functional restores: never clobber text or a quote the user produced
    // while the reply was in flight (the composer stays enabled), and never
    // drop the failed question in its favour.
    const rollback = (error: string) => {
      setMessages((m) => m.slice(0, -1));
      setInput((current) => restoreUnsent(current, question));
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

      <button
        ref={toggleRef}
        type="button"
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex size-13 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-float outline-hidden transition-colors duration-200 hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-6 sm:bottom-6"
        aria-label={t.bookChat.openLabel}
        aria-expanded={open}
        aria-controls={open ? "book-tutor-panel" : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? (
          <X className="size-[1.375rem]" aria-hidden />
        ) : (
          <MessageCircleQuestion className="size-[1.375rem]" aria-hidden />
        )}
      </button>

      {open && (
        <div
          id="book-tutor-panel"
          role="dialog"
          aria-labelledby="book-tutor-title"
          className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col rounded-t-2xl border border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-float sm:inset-x-auto sm:right-6 sm:bottom-22 sm:h-[32.5rem] sm:max-h-[calc(100dvh-8rem)] sm:w-[23.75rem] sm:rounded-2xl sm:pb-0"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <StationNode className="size-7" />
            <div className="min-w-0 flex-1">
              <h2 id="book-tutor-title" className="text-[0.9375rem] font-semibold">
                {t.bookChat.title}
              </h2>
              <p
                id="book-tutor-message-meta"
                className="text-xs text-muted-foreground tabular-nums"
              >
                {t.tutor.remainingLabel} {remaining} / {dailyLimit}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={t.bookChat.close} onClick={close}>
              <X aria-hidden />
            </Button>
          </div>

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.length === 0 && !pending ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.bookChat.emptyHint}
              </p>
            ) : null}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="sr-only">{t.tutor.youLabel}</p>
                  <div className="max-w-[88%] rounded-xl rounded-br-sm bg-brand-soft px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex">
                  <p className="sr-only">{t.tutor.coachLabel}</p>
                  <div className="max-w-[88%] rounded-xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ),
            )}
            {pending ? (
              <p role="status" className="text-sm text-muted-foreground">
                {t.tutor.thinking}
              </p>
            ) : null}
          </div>

          {error === "unavailable" ? (
            <Callout variant="accent" role="alert" className="mx-4 mb-3 px-3 py-2.5 text-xs">
              {t.tutor.unavailable}
            </Callout>
          ) : null}
          {error === "limit" ? (
            <Callout variant="accent" role="alert" className="mx-4 mb-3 px-3 py-2.5 text-xs">
              {t.tutor.limitReached}
            </Callout>
          ) : null}
          {error === "in_progress" ? (
            <Callout variant="accent" role="status" className="mx-4 mb-3 px-3 py-2.5 text-xs">
              {t.tutor.inProgress}
            </Callout>
          ) : null}
          {error === "failed" ? (
            <Callout variant="error" className="mx-4 mb-3 px-3 py-2.5 text-xs">
              {t.tutor.sendFailed}
            </Callout>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-border p-3">
            {quote ? (
              <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-soft-3">
                <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-2 min-w-0 flex-1 font-serif text-[0.8125rem]">
                  {quote}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0"
                  aria-label={t.bookChat.removeQuote}
                  onClick={() => setQuote(null)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            ) : null}
            <div className="flex items-end gap-2 rounded-xl border border-input bg-card py-1 pr-1 pl-3.5 has-focus-visible:ring-2 has-focus-visible:ring-ring">
              <label htmlFor="book-tutor-message" className="sr-only">
                {t.tutor.messageLabel}
              </label>
              <textarea
                ref={textareaRef}
                id="book-tutor-message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter breaks the line — never mid-IME.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={t.bookChat.placeholder}
                rows={1}
                maxLength={3600}
                disabled={remaining <= 0 || error === "unavailable"}
                aria-describedby="book-tutor-message-meta"
                className="field-sizing-content max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-normal outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                aria-label={t.tutor.send}
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full outline-hidden transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                  canSend
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "bg-input text-primary-foreground",
                )}
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
