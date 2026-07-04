import { BookMarked } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";

/**
 * First-run guidance: shown on the dashboard until the learner completes their
 * first activity, so a new account opens with an orientation and a concrete
 * next step instead of a wall of zeros. The exam funnel CTA lives in the
 * ExamBanner directly below, so this points at the daily vocabulary habit.
 */
export async function WelcomeCard() {
  const t = await getDict();
  return (
    <section className="border-y border-border py-6">
      <h2 className="font-serif text-2xl font-medium tracking-tight">{t.dashboard.welcomeTitle}</h2>
      <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{t.dashboard.welcomeBody}</p>
      <Button asChild variant="outline" className="mt-5">
        <Link href="/vocabulary/study">
          <BookMarked className="size-4" aria-hidden />
          {t.dashboard.learnNew}
        </Link>
      </Button>
    </section>
  );
}
