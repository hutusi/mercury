import { BookMarked, BookOpenText, Headphones, LibraryBig, Mic, PenLine } from "lucide-react";
import { MockExamCard } from "@/components/practice/MockExamCard";
import { SkillCard } from "@/components/practice/SkillCard";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import type { SkillKey } from "@/lib/learner-model-core";
import { getPracticeOverview } from "@/lib/queries/practice";
import { requireOnboarded } from "@/lib/settings";

/** Free practice by skill, with the learner model's estimate on each card. */
export default async function PracticePage() {
  const { user, goalTrack } = await requireOnboarded();
  const [t, overview] = await Promise.all([getDict(), getPracticeOverview(user.id, goalTrack)]);

  // Only a measured skill shows a level: unrated seeds would all read "40".
  const level = (skill: SkillKey) => {
    const estimate = overview.skillEstimates?.[skill];
    return estimate && estimate.confidence !== "low"
      ? { label: t.practice.level, value: Math.round(estimate.estimate) }
      : undefined;
  };
  const weak = (skill: SkillKey) =>
    overview.weakestSkill === skill ? t.practice.weakest : undefined;

  return (
    <div className="space-y-9">
      <EntryHeader title={t.practice.title} gloss={t.practice.subtitle} />

      {overview.exam ? (
        <MockExamCard
          exam={overview.exam}
          targetScore={goalTrack === "business" ? null : overview.targetScore}
          note={goalTrack === "business" ? t.practice.examBizNote : undefined}
        />
      ) : null}

      <section className="space-y-3.5">
        <SectionLabel as="h2">{t.practice.skills}</SectionLabel>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15.5rem),1fr))] gap-3">
          <SkillCard
            href="/vocabulary"
            icon={BookMarked}
            name={t.nav.vocabulary}
            meta={fill(t.practice.vocabMeta, {
              due: overview.vocab.due,
              learned: overview.vocab.learned,
            })}
            weakLabel={weak("vocab")}
            level={level("vocab")}
          />
          <SkillCard
            href="/reading"
            icon={BookOpenText}
            name={t.nav.reading}
            meta={fill(t.practice.exerciseMeta, overview.reading)}
            weakLabel={weak("reading")}
            level={level("reading")}
          />
          <SkillCard
            href="/listening"
            icon={Headphones}
            name={t.nav.listening}
            meta={fill(t.practice.exerciseMeta, overview.listening)}
            weakLabel={weak("listening")}
            level={level("listening")}
          />
          <SkillCard
            href="/writing"
            icon={PenLine}
            name={t.nav.writing}
            meta={fill(t.practice.writingMeta, { n: overview.writing.submitted })}
            weakLabel={weak("writing")}
            level={level("writing")}
          />
          <SkillCard
            href="/speaking"
            icon={Mic}
            name={t.nav.speaking}
            meta={fill(t.practice.speakingMeta, { n: overview.speaking.submitted })}
            weakLabel={weak("speaking")}
            level={level("speaking")}
          />
          <SkillCard
            href="/books"
            icon={LibraryBig}
            name={t.nav.books}
            meta={
              overview.book
                ? fill(t.practice.booksMeta, {
                    title: overview.book.title,
                    ch: overview.book.chapter,
                  })
                : t.practice.booksMetaNone
            }
          />
        </div>
      </section>
    </div>
  );
}
