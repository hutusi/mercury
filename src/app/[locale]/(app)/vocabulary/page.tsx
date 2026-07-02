import { Check } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { and, eq } from "drizzle-orm";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Stat } from "@/components/typography/Stat";
import { Button } from "@/components/ui/button";
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
    { label: t.vocab.due, value: dueCount, accent: dueCount > 0 },
    { label: t.vocab.fresh, value: freshCount, accent: false },
    { label: t.vocab.learned, value: learnedCount, accent: false },
  ];

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.vocabulary}
        ipa={t.entry.vocabularyIpa}
        pos={t.entry.vocabularyPos}
        gloss={t.vocab.subtitle}
        actions={
          <>
            <Button asChild>
              <Link href="/vocabulary/study">
                {t.vocab.study}
                {dueCount + Math.min(freshCount, 10) > 0 && (
                  <span className="ml-1.5 font-mono text-xs tabular-nums opacity-70">
                    {dueCount + Math.min(freshCount, 10)}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/vocabulary/quiz">{t.vocab.quiz}</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-4 first:pl-0">
            <Stat label={s.label} value={s.value} accent={s.accent} />
          </div>
        ))}
      </div>

      {[...topics.entries()].map(([topic, topicWords]) => (
        <section key={topic}>
          <SectionLabel as="h2" className="mb-3">
            {topic} · {topicWords.length}
          </SectionLabel>
          <table className="w-full border-y border-border text-sm">
            <tbody className="divide-y divide-border">
              {topicWords.map((w) => (
                <tr key={w.id}>
                  <td className="py-2.5 pr-4 font-serif text-base font-medium">{w.headword}</td>
                  <td className="hidden px-4 py-2.5 font-serif text-muted-foreground italic sm:table-cell">
                    {w.ipa}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-2xs text-muted-foreground uppercase">
                    {w.pos}
                  </td>
                  <td className="px-4 py-2.5 text-foreground/80">{w.translationZh}</td>
                  <td className="py-2.5 pl-4 text-right">
                    {startedIds.has(w.id) ? (
                      <span aria-label={t.vocab.learned}>
                        <Check className="ml-auto size-4" aria-hidden />
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40" aria-label={t.vocab.notLearned}>
                        ○
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
