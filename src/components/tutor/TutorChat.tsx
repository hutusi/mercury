"use client";

import { ArrowUp, Bookmark } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { StationNode } from "@/components/layout/Wordmark";
import { PremiumCta } from "@/components/premium/PremiumCta";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Callout } from "@/components/ui/callout";
import { sendTutorMessage } from "@/lib/actions/chat";
import { restoreUnsent } from "@/lib/drafts";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface ChatMessageVM {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ChatError = "unavailable" | "limit" | "in_progress" | "failed";

/**
 * The rolling tutor thread. Non-streaming by design (ADR 0013): one server
 * action per turn, both rows persisted atomically server-side; a thinking
 * row covers the wait. The composer stays pinned above the phone tabs.
 */
export function TutorChat({
  enabled,
  initialMessages,
  remainingToday,
  dailyLimit,
  memoNote,
  initialDraft = "",
  showPremiumCta = false,
}: {
  enabled: boolean;
  initialMessages: ChatMessageVM[];
  remainingToday: number;
  dailyLimit: number;
  /** The coach memo's most recent note, if the learner model has one. */
  memoNote?: string | null;
  /** A question handed over from elsewhere (`?ask=`): prefilled, never sent. */
  initialDraft?: string;
  /** Quota walls upsell only non-premium learners. */
  showPremiumCta?: boolean;
}) {
  const t = useT();
  const [messages, setMessages] = useState<ChatMessageVM[]>(initialMessages);
  const [input, setInput] = useState(initialDraft);
  const [remaining, setRemaining] = useState(remainingToday);
  // Quota exhaustion must be legible on page load, not only after a failed
  // send — a returning learner used to see just a disabled composer.
  const [error, setError] = useState<ChatError | null>(
    !enabled ? "unavailable" : remainingToday <= 0 ? "limit" : null,
  );
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerEnabled = enabled && remaining > 0;
  const canSend = composerEnabled && !pending && input.trim().length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending]);

  useEffect(() => {
    if (!initialDraft) return;
    // Hand the question over ready to edit or send — and drop it from the
    // URL so a reload doesn't paste it again.
    const el = inputRef.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
    const url = new URL(window.location.href);
    url.searchParams.delete("ask");
    window.history.replaceState(window.history.state, "", url);
  }, [initialDraft]);

  function send(text: string) {
    const content = text.trim();
    if (!composerEnabled || pending || !content) return;
    setInput("");
    setError(null);
    // Optimistic user turn; rolled back on failure with the text restored.
    setMessages((m) => [...m, { id: `local-${m.length}`, role: "user", content }]);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof sendTutorMessage>>;
      try {
        result = await sendTutorMessage({ content });
      } catch {
        // A network drop, an expired session, or any unexpected server
        // error rejects here. Uncaught, it escalated to the route error
        // boundary and blanked the page with the typed message gone; instead
        // roll back the optimistic turn and give the text back.
        setMessages((m) => m.slice(0, -1));
        setInput((current) => restoreUnsent(current, content));
        setError("failed");
        return;
      }
      if (result.ok) {
        setMessages((m) => [
          ...m,
          { id: result.message.id, role: "assistant", content: result.message.content },
        ]);
        setRemaining(result.remainingToday);
        // Spending the last message must raise the wall immediately — not
        // silently disable the composer until a reload.
        if (result.remainingToday <= 0) setError("limit");
      } else {
        setMessages((m) => m.slice(0, -1));
        // Functional restore: keep both the failed message and any text typed
        // while the reply was in flight (the composer stays enabled).
        setInput((current) => restoreUnsent(current, content));
        setError(
          result.error === "limit_reached"
            ? "limit"
            : result.error === "in_progress"
              ? "in_progress"
              : result.error === "ai_unavailable"
                ? "unavailable"
                : "failed",
        );
        if (result.error === "limit_reached") setRemaining(0);
      }
    });
  }

  const suggestions = [t.tutor.suggestion1, t.tutor.suggestion2, t.tutor.suggestion3];

  return (
    // At least a viewport tall (less the chrome and the shell's padding), so
    // a short thread still has the composer at the bottom, where a chat's is.
    <div className="mx-auto flex min-h-[calc(100dvh-var(--chrome-top)-8.5rem)] w-full max-w-[51.25rem] flex-col md:min-h-[calc(100dvh-7rem)]">
      <EntryHeader
        title={t.nav.tutor}
        gloss={t.tutor.subtitle}
        size="md"
        actions={
          <span className="text-[0.8125rem] whitespace-nowrap text-muted-foreground tabular-nums">
            {t.tutor.remainingLabel} {remaining} / {dailyLimit}
          </span>
        }
      />
      {memoNote ? (
        <p className="mt-4 flex items-start gap-2.5 rounded-md bg-muted px-3.5 py-2.5 text-[0.8125rem] leading-normal text-soft-3">
          <Bookmark className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            {t.tutor.memo}
            {memoNote}
          </span>
        </p>
      ) : null}

      <div
        className="flex flex-1 flex-col gap-[1.125rem] pt-6 pb-4"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 && !pending ? (
          <p className="text-sm text-pretty text-muted-foreground">{t.tutor.emptyHint}</p>
        ) : null}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="sr-only">{t.tutor.youLabel}</p>
              <div className="max-w-[min(35rem,86%)] rounded-xl rounded-br-sm bg-brand-soft px-4 py-3 text-[0.9375rem] leading-[1.75] text-pretty whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <StationNode className="mt-0.5 size-[1.875rem] shrink-0" />
              <p className="sr-only">{t.tutor.coachLabel}</p>
              <div className="max-w-[min(35rem,86%)] rounded-xl rounded-tl-sm border border-border bg-card px-4 py-3 text-[0.9375rem] leading-[1.75] text-pretty whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ),
        )}
        {pending ? (
          <div className="flex items-center gap-3">
            <StationNode className="size-[1.875rem] shrink-0" />
            <p role="status" className="text-sm text-muted-foreground">
              {t.tutor.thinking}
            </p>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-(--bottom-nav-h) z-10 -mx-4 flex flex-col gap-2.5 bg-background px-4 pt-2 pb-3 sm:-mx-8 sm:px-8 md:mx-0 md:px-0 md:pb-6">
        {error === "unavailable" ? (
          <Callout variant="accent" role="alert" className="p-4 text-sm">
            {t.tutor.unavailable}
          </Callout>
        ) : null}
        {error === "limit" ? (
          <Callout variant="accent" role="alert" className="space-y-2 p-4 text-sm">
            <p>{t.tutor.limitReached}</p>
            {showPremiumCta ? <PremiumCta /> : null}
          </Callout>
        ) : null}
        {error === "in_progress" ? (
          <Callout variant="accent" className="p-4 text-sm" role="status">
            {t.tutor.inProgress}
          </Callout>
        ) : null}
        {error === "failed" ? (
          <Callout variant="error" className="p-3 text-sm">
            {t.tutor.sendFailed}
          </Callout>
        ) : null}

        {composerEnabled && !input && !pending ? (
          <div
            role="group"
            aria-label={t.tutor.suggestionsLabel}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0"
          >
            {suggestions.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => send(text)}
                className="min-h-9 shrink-0 rounded-full border border-input bg-card px-3.5 py-1.5 text-[0.8125rem] whitespace-nowrap outline-hidden transition-colors duration-150 hover:border-brand focus-visible:ring-2 focus-visible:ring-ring"
              >
                {text}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card py-1.5 pr-1.5 pl-[1.125rem] shadow-float has-focus-visible:ring-2 has-focus-visible:ring-ring">
          <label htmlFor="tutor-message" className="sr-only">
            {t.tutor.messageLabel}
          </label>
          <textarea
            ref={inputRef}
            id="tutor-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter breaks the line. Never mid-IME:
              // Enter also commits a pinyin composition.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={t.tutor.placeholder}
            rows={1}
            maxLength={4000}
            disabled={!composerEnabled}
            aria-describedby="tutor-composer-hint"
            className="field-sizing-content max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[0.9375rem] leading-normal outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!canSend}
            aria-label={t.tutor.send}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full outline-hidden transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                : "bg-input text-primary-foreground",
            )}
          >
            <ArrowUp className="size-[1.125rem]" aria-hidden />
          </button>
        </div>
        <p id="tutor-composer-hint" className="sr-only">
          {t.tutor.composerHint}
        </p>
      </div>
    </div>
  );
}
