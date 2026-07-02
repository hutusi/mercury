import { BookMarked } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
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
    { label: t.vocab.due, value: dueCount, cls: "text-amber-600 dark:text-amber-400" },
    { label: t.vocab.fresh, value: freshCount, cls: "text-primary" },
    { label: t.vocab.learned, value: learnedCount, cls: "text-green-600 dark:text-green-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <span
              className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden
            >
              <BookMarked className="size-5" />
            </span>
            {t.nav.vocabulary}
          </h1>
          <p className="mt-1 text-muted-foreground">{t.vocab.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/vocabulary/study"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80"
          >
            {t.vocab.study}
            {dueCount + Math.min(freshCount, 10) > 0 && (
              <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                {dueCount + Math.min(freshCount, 10)}
              </span>
            )}
          </Link>
          <Link
            href="/vocabulary/quiz"
            className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20"
          >
            {t.vocab.quiz}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center shadow-xs">
            <p className={`text-3xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {[...topics.entries()].map(([topic, topicWords]) => (
        <section key={topic}>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {topic} · {topicWords.length}
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <table className="w-full text-sm">
              <tbody>
                {topicWords.map((w, i) => (
                  <tr key={w.id} className={i > 0 ? "border-t" : ""}>
                    <td className="px-4 py-2.5 font-semibold">{w.headword}</td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground/70 sm:table-cell">
                      {w.ipa}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground/70">{w.pos}</td>
                    <td className="px-4 py-2.5 text-foreground/80">{w.translationZh}</td>
                    <td className="px-4 py-2.5 text-right">
                      {startedIds.has(w.id) ? (
                        <span
                          className="text-green-500 dark:text-green-400"
                          aria-label={t.vocab.learned}
                        >
                          ●
                        </span>
                      ) : (
                        <span className="text-muted-foreground/25" aria-label={t.vocab.notLearned}>
                          ●
                        </span>
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
