"use client";

import { Headphones, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TtsPlayer } from "@/components/listening/TtsPlayer";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { PassageText } from "@/components/typography/PassageText";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { saveExamProgress, submitExamSection } from "@/lib/actions/exams";
import type { AnswerMap, SectionDeadline } from "@/lib/db/schema";
import { clearExamMirror, examMirrorKey, examRetryDelayMs } from "@/lib/exam-mirror";
import { examRemainingMs, type SanitizedExamSection } from "@/lib/exam-utils";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";
import { useFlowExit } from "@/lib/flow-store";
import { cn } from "@/lib/utils";

const AUTOSAVE_MS = 30_000;

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamRunner({
  attemptId,
  sections,
  initialSectionIndex,
  initialDeadlines,
  initialAnswers,
  serverNow,
}: {
  attemptId: string;
  sections: SanitizedExamSection[];
  initialSectionIndex: number;
  initialDeadlines: SectionDeadline[];
  initialAnswers: AnswerMap;
  /** Server clock at render time — anchors the client's skew correction. */
  serverNow: number;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const storageKey = examMirrorKey(attemptId);

  const [sectionIndex, setSectionIndex] = useState(initialSectionIndex);
  const [deadlines, setDeadlines] = useState(initialDeadlines);
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  // Screen-reader time warnings: the visual clock is aria-labelled but never
  // announced; announce once at 5:00 and once at 1:00 per section.
  const [timeAnnouncement, setTimeAnnouncement] = useState<string | null>(null);
  // null until the first tick seeds it from the observed remaining, so a
  // reload mid-window doesn't false-announce a threshold already crossed.
  const announcedRef = useRef<{ five: boolean; one: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Autosave is visible: a learner on a flaky connection should know their
  // answers are only on this device until the next save lands.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const lastSavedJson = useRef(JSON.stringify(initialAnswers));
  const saveRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFailures = useRef(0);
  const autoSubmitRetries = useRef(0);
  const autoSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Retry timers must call the latest callbacks, not the ones they closed over.
  const doSubmitSectionRef = useRef<
    (sectionId: string, options?: { auto?: boolean }) => Promise<void>
  >(async () => {});
  const flushAutosaveRef = useRef<() => void>(() => {});

  // The clock keeps running and answers autosave: leaving asks first.
  useFlowExit("confirm", true);

  const submittedSections = useRef(new Set<string>());
  // Focus target after a section advance — without it, focus dies on the
  // removed submit button and screen readers get no signal the view changed.
  const sectionHeadingRef = useRef<HTMLParagraphElement>(null);
  const autosaveChain = useRef(Promise.resolve());
  // serverNow - clientNow, re-anchored on every section submit. Deadlines are
  // absolute server epoch-ms: without this correction a slow client clock
  // shows time remaining while the server already rejects answers, and a
  // fast one steals exam time. Set in an effect — computing it during render
  // would diverge between the server pass and hydration. Both anchors may
  // only ever err toward showing MORE time (here by the transfer + hydration
  // latency; on submits by the response transit), which the server's 30s
  // grace absorbs — never toward stealing it.
  const clockSkewMs = useRef(0);
  useEffect(() => {
    clockSkewMs.current = serverNow - Date.now();
  }, [serverNow]);
  // Latest-ref pattern: interval callbacks and submit read the current
  // answers without retriggering their effects.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const section = sections[sectionIndex];
  const deadline = deadlines.find((d) => d.sectionId === section?.id);

  const sectionQuestions = useMemo(
    () => (section ? section.groups.flatMap((g) => g.questions) : []),
    [section],
  );

  const sectionAnswers = useMemo(() => {
    const ids = new Set(sectionQuestions.map((q) => q.id));
    return Object.fromEntries(Object.entries(answers).filter(([qid]) => ids.has(qid)));
  }, [answers, sectionQuestions]);

  // Refresh-safe mirror of answers. localStorage wins over the server
  // snapshot: it is written on every click, while the server only has the
  // last autosave (up to 30s stale). Must run post-hydration (not as a state
  // initializer): the server render can't see localStorage, and diverging
  // during hydration would mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe restore from an external store
      if (stored) setAnswers((a) => ({ ...a, ...JSON.parse(stored) }));
    } catch {
      // Ignore corrupted local state.
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // Storage full/blocked — server autosave still covers us.
    }
  }, [answers, storageKey]);

  const doSubmitSection = useCallback(
    async (sectionId: string, { auto = false }: { auto?: boolean } = {}) => {
      if (submittedSections.current.has(sectionId)) return;
      submittedSections.current.add(sectionId);
      setSubmitting(true);
      setConfirming(false);
      setSubmitError(null);
      try {
        const result = await submitExamSection({
          attemptId,
          sectionId,
          answers: answersRef.current,
        });
        // serverTime is stamped at the END of server work (after auth + the
        // submit transaction), so anchor against the response receipt: only
        // the response transit goes unaccounted, and it errs toward showing
        // MORE time — never less. A request midpoint would masquerade server
        // processing time (which can be seconds under lock contention) as
        // skew and shorten the next section's timer.
        clockSkewMs.current = result.serverTime - Date.now();
        autoSubmitRetries.current = 0;
        // The submit carried every answer: nothing is left for autosave.
        lastSavedJson.current = JSON.stringify(answersRef.current);
        if (result.done) {
          clearExamMirror(attemptId);
          router.push(localePath(locale, `/exams/attempts/${attemptId}`));
          return;
        }
        announcedRef.current = null;
        setTimeAnnouncement(null);
        setSectionIndex(result.nextSectionIndex);
        setDeadlines(result.deadlines);
        window.scrollTo({ top: 0 });
        // After React commits the new section — a synchronous focus would
        // have the screen reader announce the section just left.
        requestAnimationFrame(() => sectionHeadingRef.current?.focus());
      } catch {
        // Un-mark so the user can retry — the server clamps late answers,
        // so retrying after expiry is safe and still completes the attempt.
        submittedSections.current.delete(sectionId);
        if (auto && autoSubmitRetries.current < 6) {
          // The deadline already fired and its timer is gone: nothing would
          // submit this section again until the learner noticed. Keep trying
          // on our own, backing off, while the error stays visible.
          const delay = examRetryDelayMs(autoSubmitRetries.current);
          autoSubmitRetries.current += 1;
          setSubmitError(t.exams.autoSubmitRetrying);
          autoSubmitTimer.current = setTimeout(
            () => void doSubmitSectionRef.current(sectionId, { auto: true }),
            delay,
          );
        } else {
          setSubmitError(t.exams.submitFailed);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [attemptId, locale, router, t],
  );
  useEffect(() => {
    doSubmitSectionRef.current = doSubmitSection;
  }, [doSubmitSection]);
  // A pending auto-submit retry must not fire (and navigate) after the learner
  // has left the runner.
  useEffect(
    () => () => {
      if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
    },
    [],
  );

  // The clock: remaining time derives from the server-issued deadline
  // (skew-corrected), never a local decrementing counter, so tab throttling
  // and refreshes can't help.
  useEffect(() => {
    if (!deadline) return;
    const tick = setInterval(() => {
      const remaining = examRemainingMs(deadline.expiresAt, clockSkewMs.current, Date.now());
      setRemainingMs(remaining);
      if (announcedRef.current === null) {
        announcedRef.current = { five: remaining <= 300_000, one: remaining <= 60_000 };
      } else {
        if (remaining <= 300_000 && !announcedRef.current.five) {
          announcedRef.current.five = true;
          setTimeAnnouncement(t.exams.fiveMinutesLeft);
        }
        if (remaining <= 60_000 && !announcedRef.current.one) {
          announcedRef.current.one = true;
          setTimeAnnouncement(t.exams.oneMinuteLeft);
        }
      }
      if (remaining <= 0) {
        clearInterval(tick);
        void doSubmitSection(deadline.sectionId, { auto: true });
      }
    }, 500);
    return () => clearInterval(tick);
  }, [deadline, doSubmitSection, t]);

  // One server autosave of the current answers, serialized behind any save
  // still in flight so click order is preserved even when a request outlasts
  // the interval (the server also serializes merges with section submit).
  // Skipped when nothing changed since the last save that landed. A failure
  // is shown and retried on a backoff instead of waiting for the next tick;
  // the chain always settles, so a failed save is never an unhandled
  // rejection.
  const flushAutosave = useCallback(() => {
    const snapshot = { ...answersRef.current };
    const json = JSON.stringify(snapshot);
    if (json === lastSavedJson.current) return;
    if (saveRetryTimer.current) clearTimeout(saveRetryTimer.current);
    setSaveState("saving");
    autosaveChain.current = autosaveChain.current.then(() => {
      // A save queued ahead of this one (a tick racing the retry or a tab
      // hide) may already have landed this exact snapshot.
      if (json === lastSavedJson.current) return;
      return saveExamProgress({ attemptId, answers: snapshot }).then(
        () => {
          lastSavedJson.current = json;
          saveFailures.current = 0;
          setSaveState("saved");
        },
        () => {
          setSaveState("failed");
          const delay = examRetryDelayMs(saveFailures.current);
          saveFailures.current += 1;
          saveRetryTimer.current = setTimeout(() => flushAutosaveRef.current(), delay);
        },
      );
    });
  }, [attemptId]);
  useEffect(() => {
    flushAutosaveRef.current = flushAutosave;
  }, [flushAutosave]);

  // Periodic server autosave of the current section's answers.
  useEffect(() => {
    const timer = setInterval(flushAutosave, AUTOSAVE_MS);
    return () => {
      clearInterval(timer);
      if (saveRetryTimer.current) clearTimeout(saveRetryTimer.current);
    };
  }, [flushAutosave]);

  // Backgrounded tabs throttle intervals to ~1/min, so up to a minute of
  // clicks could sit past the last autosave when the deadline lapses —
  // flush once more the moment the tab hides.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flushAutosave();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [flushAutosave]);

  if (!section || !deadline) return null;

  const answeredCount = Object.keys(sectionAnswers).length;
  const lowTime = remainingMs !== null && remainingMs < 60_000;
  const questionNumberById = new Map(sectionQuestions.map((q, i) => [q.id, i + 1]));

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky header: section, timer, autosave state, question palette */}
      <div className="sticky top-(--chrome-top) z-10 -mx-4 border-b border-border bg-background px-4 py-3 sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p
              ref={sectionHeadingRef}
              tabIndex={-1}
              className="text-sm font-semibold outline-hidden"
            >
              {sectionIndex + 1}/{sections.length} ·{" "}
              {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection}
            </p>
            <p className="truncate text-xs text-muted-foreground">{section.titleZh}</p>
          </div>
          <div className="flex items-center gap-3">
            {saveState !== "idle" ? (
              <p
                role={saveState === "failed" ? "alert" : "status"}
                className={cn(
                  "text-xs",
                  saveState === "failed" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {saveState === "saving"
                  ? t.exams.autosaveSaving
                  : saveState === "saved"
                    ? t.exams.autosaveSaved
                    : t.exams.autosaveFailed}
              </p>
            ) : null}
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-base font-semibold tabular-nums",
                // Under a minute the clock inverts: urgent without borrowing coral,
                // which means "mistake" in this palette.
                lowTime ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
              role="timer"
              aria-label={t.exams.timeLeft}
            >
              <Timer className="size-4" aria-hidden />
              {remainingMs === null ? "--:--" : formatClock(remainingMs)}
            </div>
          </div>
          <p aria-live="polite" role="status" className="sr-only">
            {timeAnnouncement}
          </p>
        </div>
        <nav aria-label={t.exams.palette} className="mt-2.5 flex flex-wrap gap-1.5">
          {sectionQuestions.map((q, i) => {
            const answered = sectionAnswers[q.id] !== undefined;
            return (
              <a
                key={q.id}
                href={`#q-${q.id}`}
                aria-label={`${i + 1}${answered ? "" : ` · ${t.exams.unanswered}`}`}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  answered
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground hover:bg-track",
                )}
              >
                <span aria-hidden>{i + 1}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {section.kind === "listening" ? (
        <Callout variant="accent" className="flex items-center gap-2.5 px-4 py-3 text-sm">
          <Headphones className="size-4 shrink-0 text-brand" aria-hidden />
          {t.exams.audioOnce}
        </Callout>
      ) : null}

      {section.groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-4">
          {group.script ? (
            <TtsPlayer script={group.script} audioUrl={group.audioUrl} maxPlays={1} />
          ) : null}
          {group.passage ? (
            <article className="rounded-xl border border-border bg-card px-5 py-5 sm:px-6">
              <PassageText>{group.passage}</PassageText>
            </article>
          ) : null}
          <ol className="flex flex-col gap-3.5">
            {group.questions.map((q) => {
              const number = questionNumberById.get(q.id) ?? 0;
              return (
                <li key={q.id} id={`q-${q.id}`} className="scroll-mt-40">
                  <QuestionsForm
                    questions={[{ ...q, stem: `${number}. ${q.stem}` }]}
                    answers={sectionAnswers}
                    onAnswer={(qid, choice) => setAnswers((a) => ({ ...a, [qid]: choice }))}
                    disabled={submitting}
                    numbered={false}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        {submitError ? (
          <Callout variant="error" className="px-4 py-3 text-center text-sm">
            {submitError}
          </Callout>
        ) : null}
        {confirming ? (
          <div className="rounded-xl border border-border bg-card px-5 py-4 text-center">
            <p className="text-sm font-medium">{t.exams.confirmSubmitSection}</p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {t.exams.answered} {answeredCount}/{sectionQuestions.length}
            </p>
            <div className="mt-3.5 flex justify-center gap-2.5">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => void doSubmitSection(section.id)} disabled={submitting}>
                {submitting
                  ? t.common.loading
                  : sectionIndex === sections.length - 1
                    ? t.common.finish
                    : t.exams.nextSection}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={submitting} size="lg">
            {t.exams.submitSection} ({answeredCount}/{sectionQuestions.length})
          </Button>
        )}
      </div>
    </div>
  );
}
