"use client";

import { ArrowRight, Check, MessageCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { cn } from "@/lib/utils";

export interface CardMeta {
  /** "阅读 · Delivery Delay Notice" */
  source: string;
  /** Missed within the last few minutes (computed against the server clock). */
  fresh: boolean;
  times: string;
}

/** The notebook card: source and miss count above whatever the item shows. */
export function MistakeCardShell({
  kind,
  meta,
  highlighted,
  children,
}: {
  kind: string;
  meta: CardMeta;
  /** Brand border once answered correctly. */
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <li
      data-mistake-kind={kind}
      className={cn(
        "rounded-xl border bg-card px-5 py-[1.125rem] transition-colors duration-200",
        highlighted ? "border-brand-border" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{meta.source}</span>
        {meta.fresh ? (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-ink">
            {t.mistakes.fresh}
          </span>
        ) : null}
        <span className="flex-1" />
        <span className="text-coral-ink tabular-nums">{meta.times}</span>
      </div>
      {children}
    </li>
  );
}

/**
 * After a retest: "correct — cleared" with a way on, or "incorrect" with a
 * retry and the tutor. Announced politely; the explanation rides along.
 */
export function RetestOutcome({
  correct,
  explanation,
  askHref,
  pending,
  onRetry,
  onContinue,
}: {
  correct: boolean;
  explanation?: string;
  askHref: string;
  pending?: boolean;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-3">
      <p
        role="status"
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium",
          correct ? "text-brand-ink" : "text-coral-ink",
        )}
      >
        {correct ? (
          <Check className="size-[1.0625rem]" aria-hidden />
        ) : (
          <X className="size-[1.0625rem]" aria-hidden />
        )}
        <span className="flex-1">
          {correct ? t.mistakes.retestCorrect : t.mistakes.retestWrong}
        </span>
        {!correct ? (
          <Link
            href={askHref}
            className="inline-flex items-center gap-1.5 rounded-sm py-1.5 text-[0.8125rem] font-medium text-brand-ink outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            {t.reading.ask}
          </Link>
        ) : null}
      </p>
      {explanation ? (
        <div className="mt-2.5 rounded-md bg-muted px-3.5 py-3 text-sm leading-[1.75] text-soft-3">
          <span className="font-semibold text-foreground">{t.reading.explanationLabel}</span>
          {explanation}
        </div>
      ) : null}
      <div className="mt-3">
        {correct ? (
          <Button onClick={onContinue}>
            {t.mistakes.next}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button variant="outline" onClick={onRetry} disabled={pending}>
            <RotateCcw aria-hidden />
            {t.mistakes.retestAgain}
          </Button>
        )}
      </div>
    </div>
  );
}

export function RetestButton({ onClick, pending }: { onClick: () => void; pending?: boolean }) {
  const t = useT();
  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      <RotateCcw aria-hidden />
      {pending ? t.common.loading : t.mistakes.retest}
    </Button>
  );
}
