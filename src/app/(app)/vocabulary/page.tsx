import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { srsCards, vocabWords } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function VocabularyPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [words, cards] = await Promise.all([
    db.query.vocabWords.findMany({
      where: eq(vocabWords.track, track),
      orderBy: vocabWords.sortOrder,
    }),
    db
      .select({ wordId: srsCards.wordId, dueAt: srsCards.dueAt })
      .from(srsCards)
      .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
      .where(and(eq(srsCards.userId, user.id), eq(vocabWords.track, track))),
  ]);

  // eslint-disable-next-line react-hooks/purity -- server component: runs once per request, not re-rendered
  const now = Date.now();
  const startedIds = new Set(cards.map((c) => c.wordId));
  const dueCount = cards.filter((c) => c.dueAt.getTime() <= now).length;
  const freshCount = words.length - startedIds.size;
  const learnedCount = startedIds.size;

  const topics = new Map<string, typeof words>();
  for (const w of words) {
    const list = topics.get(w.topic) ?? [];
    list.push(w);
    topics.set(w.topic, list);
  }

  const stats = [
    { label: t.vocab.due, value: dueCount, cls: "text-accent-600" },
    { label: t.vocab.fresh, value: freshCount, cls: "text-brand-600" },
    { label: t.vocab.learned, value: learnedCount, cls: "text-green-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <span aria-hidden>📚</span> {t.nav.vocabulary}
          </h1>
          <p className="mt-1 text-slate-500">{t.vocab.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/vocabulary/study"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {t.vocab.study}
            {dueCount + Math.min(freshCount, 10) > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {dueCount + Math.min(freshCount, 10)}
              </span>
            )}
          </Link>
          <Link
            href="/vocabulary/quiz"
            className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            {t.vocab.quiz}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-3xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {[...topics.entries()].map(([topic, topicWords]) => (
        <section key={topic}>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {topic} · {topicWords.length}
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody>
                {topicWords.map((w, i) => (
                  <tr key={w.id} className={i > 0 ? "border-t border-slate-100" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{w.headword}</td>
                    <td className="hidden px-4 py-2.5 text-slate-400 sm:table-cell">{w.ipa}</td>
                    <td className="px-4 py-2.5 text-slate-400">{w.pos}</td>
                    <td className="px-4 py-2.5 text-slate-700">{w.translationZh}</td>
                    <td className="px-4 py-2.5 text-right">
                      {startedIds.has(w.id) ? (
                        <span className="text-green-500" aria-label={t.vocab.learned}>
                          ●
                        </span>
                      ) : (
                        <span className="text-slate-200">●</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
