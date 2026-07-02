import { BookMarked } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getDict } from "@/lib/i18n";

export async function DueWordsCard({ dueCount }: { dueCount: number }) {
  const t = await getDict();
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t.dashboard.dueWords}</p>
          <p className="mt-1 text-3xl font-bold">
            {dueCount}{" "}
            <span className="text-base font-medium text-muted-foreground">
              {t.dashboard.dueWordsUnit}
            </span>
          </p>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <BookMarked className="size-5" />
        </div>
      </div>
      <Link
        href="/vocabulary/study"
        className={`mt-3 inline-block rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
          dueCount > 0
            ? "bg-primary text-primary-foreground hover:bg-primary/80"
            : "border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {dueCount > 0 ? t.dashboard.reviewNow : t.dashboard.learnNew}
      </Link>
    </div>
  );
}
