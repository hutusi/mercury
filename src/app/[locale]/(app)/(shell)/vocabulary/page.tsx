import { Check } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Stat } from "@/components/typography/Stat";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";
import { getVocabOverview, MAX_DUE_PER_SESSION, MAX_NEW_PER_SESSION } from "@/lib/queries/vocab";
import { requireOnboarded } from "@/lib/settings";

export default async function VocabularyPage() {
  const [{ user, goalTrack }, t] = await Promise.all([requireOnboarded(), getDict()]);

  // Personal collection — never track-filtered (ADR 0029): the overview counts
  // and word list cover everything the learner has touched, on every track.
  const { words, startedIds, dueCount, freshCount, learnedCount } = await getVocabOverview(
    user.id,
    null,
  );

  // The Study badge predicts the session size, so it caps at what one
  // session actually loads (due cards spill into the next session).
  const sessionSize =
    Math.min(dueCount, MAX_DUE_PER_SESSION) + Math.min(freshCount, MAX_NEW_PER_SESSION);

  // The quiz is single-track by design and resolves to the goal track.
  const studyHref = "/vocabulary/study";
  const quizHref = "/vocabulary/quiz";

  // Scenario-first: words group by topic across packs — vocabulary isn't
  // owned by tracks. Topics touching the goal pack sort first (the same
  // invisible prioritization the study queue's new-word spillover uses),
  // alphabetical within each tier.
  const topics = new Map<string, typeof words>();
  for (const w of words) {
    const list = topics.get(w.topic) ?? [];
    list.push(w);
    topics.set(w.topic, list);
  }
  const sortedTopics = [...topics.entries()].sort((a, b) => {
    const aGoal = a[1].some((w) => w.track === goalTrack) ? 0 : 1;
    const bGoal = b[1].some((w) => w.track === goalTrack) ? 0 : 1;
    return aGoal - bGoal || a[0].localeCompare(b[0]);
  });

  const stats = [
    { label: t.vocab.due, value: dueCount },
    { label: t.vocab.fresh, value: freshCount },
    { label: t.vocab.learned, value: learnedCount },
  ];

  return (
    <div className="flex flex-col gap-8">
      <EntryHeader
        title={t.nav.vocabulary}
        ipa={t.entry.vocabularyIpa}
        pos={t.entry.vocabularyPos}
        gloss={t.vocab.subtitle}
        actions={
          <>
            <Button asChild>
              <Link href={studyHref}>
                {t.vocab.study}
                {sessionSize > 0 ? (
                  <span className="rounded-full bg-primary-foreground/15 px-2 text-xs tabular-nums">
                    {sessionSize}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={quizHref}>{t.vocab.quiz}</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-4 sm:px-6">
            <Stat label={s.label} value={s.value} />
          </div>
        ))}
      </div>

      {sortedTopics.map(([topic, topicWords]) => (
        <section key={topic} className="flex flex-col gap-3">
          <SectionLabel as="h2" note={topicWords.length}>
            {topic}
          </SectionLabel>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {topicWords.map((w) => {
              const learned = startedIds.has(w.id);
              return (
                <li key={w.id} className="flex items-baseline gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 shrink-0 font-serif text-[1.0625rem] font-medium">
                    {w.headword}
                  </span>
                  <span className="hidden font-serif text-muted-foreground italic sm:inline">
                    {w.ipa}
                  </span>
                  <span className="font-serif text-xs font-semibold text-brand-ink italic">
                    {w.pos}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-soft-3">{w.translationZh}</span>
                  {learned ? (
                    <Check
                      className="size-4 shrink-0 self-center text-brand"
                      role="img"
                      aria-label={t.vocab.learned}
                    />
                  ) : (
                    <span
                      className="size-3.5 shrink-0 self-center rounded-full border-[1.5px] border-input"
                      role="img"
                      aria-label={t.vocab.notLearned}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
