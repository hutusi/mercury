"use client";

import { Headphones } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TtsPlayer } from "@/components/listening/TtsPlayer";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { saveExamProgress, submitExamSection } from "@/lib/actions/exams";
import type { AnswerMap, SectionDeadline } from "@/lib/db/schema";
import type { SanitizedExamSection } from "@/lib/exam-utils";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

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
}: {
  attemptId: string;
  sections: SanitizedExamSection[];
  initialSectionIndex: number;
  initialDeadlines: SectionDeadline[];
  initialAnswers: AnswerMap;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const storageKey = `mercury-exam-${attemptId}`;

  const [sectionIndex, setSectionIndex] = useState(initialSectionIndex);
  const [deadlines, setDeadlines] = useState(initialDeadlines);
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submittedSections = useRef(new Set<string>());
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
    async (sectionId: string) => {
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
        if (result.done) {
          try {
            localStorage.removeItem(storageKey);
          } catch {
            // Best-effort cleanup.
          }
          router.push(localePath(locale, `/exams/attempts/${attemptId}`));
          return;
        }
        setSectionIndex(result.nextSectionIndex);
        setDeadlines(result.deadlines);
        window.scrollTo({ top: 0 });
      } catch {
        // Un-mark so the user can retry — the server clamps late answers,
        // so retrying after expiry is safe and still completes the attempt.
        submittedSections.current.delete(sectionId);
        setSubmitError(t.exams.submitFailed);
      } finally {
        setSubmitting(false);
      }
    },
    [attemptId, locale, router, storageKey, t],
  );

  // The clock: remaining time derives from the server-issued deadline, never
  // a local decrementing counter, so tab throttling and refreshes can't help.
  useEffect(() => {
    if (!deadline) return;
    const tick = setInterval(() => {
      const remaining = deadline.expiresAt - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        void doSubmitSection(deadline.sectionId);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [deadline, doSubmitSection]);

  // Periodic server autosave of the current section's answers.
  useEffect(() => {
    const timer = setInterval(() => {
      void saveExamProgress({ attemptId, answers: answersRef.current });
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [attemptId]);

  if (!section || !deadline) return null;

  const answeredCount = Object.keys(sectionAnswers).length;
  const lowTime = remainingMs !== null && remainingMs < 60_000;
  const questionNumberById = new Map(sectionQuestions.map((q, i) => [q.id, i + 1]));

  return (
    <div className="space-y-6">
      {/* Sticky header: section info + timer + palette */}
      <div className="sticky top-14 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {sectionIndex + 1}/{sections.length} ·{" "}
              {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection}
            </p>
            <p className="text-xs text-muted-foreground">{section.titleZh}</p>
          </div>
          <div
            className={`rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${
              lowTime
                ? "animate-pulse bg-destructive/10 text-destructive"
                : "bg-muted text-foreground/80"
            }`}
            aria-label={t.exams.timeLeft}
          >
            ⏱ {remainingMs === null ? "--:--" : formatClock(remainingMs)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sectionQuestions.map((q, i) => (
            <a
              key={q.id}
              href={`#q-${q.id}`}
              className={`flex h-7 w-7 items-center justify-center rounded text-xs font-semibold transition ${
                sectionAnswers[q.id] !== undefined
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {i + 1}
            </a>
          ))}
        </div>
      </div>

      {section.kind === "listening" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
          <span aria-hidden>
            <Headphones className="inline size-4" />
          </span>{" "}
          {t.exams.audioOnce}
        </p>
      )}

      {section.groups.map((group) => (
        <div key={group.id} className="space-y-4">
          {group.script && <TtsPlayer script={group.script} />}
          {group.passage && (
            <article className="rounded-xl border bg-card p-6 shadow-xs">
              <div className="leading-relaxed whitespace-pre-line text-foreground/80">
                {group.passage}
              </div>
            </article>
          )}
          <ol className="space-y-4">
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

      <div className="rounded-xl border bg-card p-5 shadow-xs">
        {submitError && (
          <p className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
            {submitError}
          </p>
        )}
        {confirming ? (
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-foreground/80">{t.exams.confirmSubmitSection}</p>
            <p className="text-xs text-muted-foreground">
              {t.exams.answered} {answeredCount}/{sectionQuestions.length}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border bg-card px-5 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => void doSubmitSection(section.id)}
                disabled={submitting}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
              >
                {submitting
                  ? t.common.loading
                  : sectionIndex === sections.length - 1
                    ? t.common.finish
                    : t.exams.nextSection}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
          >
            {t.exams.submitSection} ({answeredCount}/{sectionQuestions.length})
          </button>
        )}
      </div>
    </div>
  );
}
