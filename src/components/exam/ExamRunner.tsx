"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TtsPlayer } from "@/components/listening/TtsPlayer";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { saveExamProgress, submitExamSection } from "@/lib/actions/exams";
import type { AnswerMap, SectionDeadline } from "@/lib/db/schema";
import type { SanitizedExamSection } from "@/lib/exam-utils";
import { useT } from "@/lib/i18n/LocaleProvider";

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
  const router = useRouter();
  const storageKey = `mercury-exam-${attemptId}`;

  const [sectionIndex, setSectionIndex] = useState(initialSectionIndex);
  const [deadlines, setDeadlines] = useState(initialDeadlines);
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submittedSections = useRef(new Set<string>());
  const answersRef = useRef(answers);
  answersRef.current = answers;

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

  // Refresh-safe mirror of answers.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setAnswers((a) => ({ ...JSON.parse(stored), ...a }));
    } catch {
      // Ignore corrupted local state.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          router.push(`/exams/attempts/${attemptId}`);
          return;
        }
        setSectionIndex(result.nextSectionIndex);
        setDeadlines(result.deadlines);
        window.scrollTo({ top: 0 });
      } finally {
        setSubmitting(false);
      }
    },
    [attemptId, router, storageKey],
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
  let questionNumber = 0;

  return (
    <div className="space-y-6">
      {/* Sticky header: section info + timer + palette */}
      <div className="sticky top-14 z-10 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {sectionIndex + 1}/{sections.length} ·{" "}
              {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection}
            </p>
            <p className="text-xs text-slate-500">{section.titleZh}</p>
          </div>
          <div
            className={`rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${
              lowTime ? "animate-pulse bg-red-50 text-red-600" : "bg-slate-100 text-slate-800"
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
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {i + 1}
            </a>
          ))}
        </div>
      </div>

      {section.kind === "listening" && (
        <p className="rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-accent-700">
          <span aria-hidden>🎧</span> {t.exams.audioOnce}
        </p>
      )}

      {section.groups.map((group) => (
        <div key={group.id} className="space-y-4">
          {group.script && <TtsPlayer script={group.script} />}
          {group.passage && (
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="leading-relaxed whitespace-pre-line text-slate-800">
                {group.passage}
              </div>
            </article>
          )}
          <ol className="space-y-4">
            {group.questions.map((q) => {
              questionNumber += 1;
              const number = questionNumber;
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

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {confirming ? (
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-slate-800">{t.exams.confirmSubmitSection}</p>
            <p className="text-xs text-slate-500">
              {t.exams.answered} {answeredCount}/{sectionQuestions.length}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => void doSubmitSection(section.id)}
                disabled={submitting}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
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
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {t.exams.submitSection} ({answeredCount}/{sectionQuestions.length})
          </button>
        )}
      </div>
    </div>
  );
}
