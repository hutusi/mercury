"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Textarea } from "@/components/ui/textarea";
import { sendTutorMessage } from "@/lib/actions/chat";
import { useT } from "@/lib/i18n/LocaleProvider";

export interface ChatMessageVM {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * The rolling tutor thread. Non-streaming by design (ADR 0013): one server
 * action per turn, both rows persisted atomically server-side; a typing
 * indicator covers the wait.
 */
export function TutorChat({
  enabled,
  initialMessages,
  remainingToday,
}: {
  enabled: boolean;
  initialMessages: ChatMessageVM[];
  remainingToday: number;
}) {
  const t = useT();
  const [messages, setMessages] = useState<ChatMessageVM[]>(initialMessages);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(remainingToday);
  const [error, setError] = useState<"unavailable" | "limit" | "failed" | null>(
    enabled ? null : "unavailable",
  );
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending]);

  const canSend = enabled && remaining > 0 && !pending && input.trim().length > 0;

  function send() {
    if (!canSend) return;
    const content = input.trim();
    setInput("");
    setError(null);
    // Optimistic user turn; replaced by nothing on failure (input restored).
    setMessages((m) => [...m, { id: `local-${m.length}`, role: "user", content }]);
    startTransition(async () => {
      const result = await sendTutorMessage({ content });
      if (result.ok) {
        setMessages((m) => [
          ...m,
          { id: result.message.id, role: "assistant", content: result.message.content },
        ]);
        setRemaining(result.remainingToday);
      } else {
        setMessages((m) => m.slice(0, -1));
        setInput(content);
        setError(result.error === "limit_reached" ? "limit" : "failed");
        if (result.error === "limit_reached") setRemaining(0);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {messages.length === 0 && !pending && (
        <p className="text-sm text-muted-foreground">{t.tutor.emptyHint}</p>
      )}

      <div className="space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "border-l-2 border-border pl-4" : ""}>
            <SectionLabel as="p" className="mb-1">
              {m.role === "user" ? t.tutor.youLabel : t.tutor.coachLabel}
            </SectionLabel>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {pending && <p className="text-sm text-muted-foreground">{t.tutor.thinking}</p>}
        <div ref={endRef} />
      </div>

      {error === "unavailable" && (
        <Callout variant="accent" className="p-4 text-sm">
          {t.tutor.unavailable}
        </Callout>
      )}
      {error === "limit" && (
        <Callout variant="accent" className="p-4 text-sm">
          {t.tutor.limitReached}
        </Callout>
      )}
      {error === "failed" && (
        <Callout variant="error" className="p-3 text-sm">
          {t.tutor.sendFailed}
        </Callout>
      )}

      <div className="space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t.tutor.placeholder}
          rows={3}
          maxLength={4000}
          disabled={!enabled || remaining <= 0}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            {t.tutor.remainingLabel}: {remaining}
          </p>
          <Button onClick={send} disabled={!canSend}>
            <Send className="size-4" aria-hidden />
            {t.tutor.send}
          </Button>
        </div>
      </div>
    </div>
  );
}
