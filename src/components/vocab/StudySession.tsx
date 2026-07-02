"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { gradeCard } from "@/lib/actions/vocab";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { ReviewGrade } from "@/lib/srs";

export interface StudyCardData {
  wordId: string;
  headword: string;
  ipa: string;
  pos: string;
  definitionEn: string;
  translationZh: string;
  exampleEn: string;
  exampleZh: string;
  isNew: boolean;
}

export function StudySession({ cards }: { cards: StudyCardData[] }) {
  const t = useT();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [pending, startTransition] = useTransition();

  const card = queue[index];

  function grade(g: ReviewGrade) {
    if (!card || pending) return;
    startTransition(async () => {
      await gradeCard({ wordId: card.wordId, grade: g });
      setReviewed((n) => n + 1);
      // "Again" re-queues the card at the end of this session.
      setQueue((q) => (g === 1 ? [...q, { ...card, isNew: false }] : q));
      setFlipped(false);
      setIndex((i) => i + 1);
    });
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{t.vocab.sessionDone}</h2>
        <p className="mt-2 text-slate-500">
          {t.vocab.reviewedCount}: {reviewed}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/vocabulary"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.common.back}
          </Link>
          <Link
            href="/vocabulary/quiz"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t.vocab.startQuiz}
          </Link>
        </div>
      </div>
    );
  }

  const gradeButtons: { grade: ReviewGrade; label: string; cls: string }[] = [
    { grade: 1, label: t.vocab.again, cls: "bg-red-500 hover:bg-red-600" },
    { grade: 3, label: t.vocab.hard, cls: "bg-accent-500 hover:bg-accent-600" },
    { grade: 4, label: t.vocab.good, cls: "bg-green-500 hover:bg-green-600" },
    { grade: 5, label: t.vocab.easy, cls: "bg-brand-500 hover:bg-brand-600" },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span>
          {t.vocab.reviewedCount}: {reviewed}
        </span>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="block min-h-72 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md"
      >
        {card.isNew && (
          <span className="mb-3 inline-block rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
            {t.vocab.fresh}
          </span>
        )}
        <p className="text-4xl font-bold text-slate-900">{card.headword}</p>
        <p className="mt-2 text-slate-500">
          {card.ipa} · {card.pos}
        </p>
        {flipped ? (
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-6 text-left">
            <p className="text-center text-2xl font-semibold text-brand-700">
              {card.translationZh}
            </p>
            <p className="text-center text-sm text-slate-600">{card.definitionEn}</p>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-800">{card.exampleEn}</p>
              <p className="mt-1 text-slate-500">{card.exampleZh}</p>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm text-slate-400">{t.vocab.flipHint}</p>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {gradeButtons.map((b) => (
            <button
              key={b.grade}
              onClick={() => grade(b.grade)}
              disabled={pending}
              className={`rounded-lg px-3 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${b.cls}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
