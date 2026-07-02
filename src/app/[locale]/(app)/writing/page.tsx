import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { writingPrompts, writingSubmissions } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function WritingListPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [prompts, submissions] = await Promise.all([
    db.query.writingPrompts.findMany({
      where: eq(writingPrompts.track, track),
      orderBy: writingPrompts.id,
    }),
    db.query.writingSubmissions.findMany({
      where: and(eq(writingSubmissions.userId, user.id)),
      orderBy: desc(writingSubmissions.createdAt),
    }),
  ]);

  const submissionsByPrompt = new Map<string, number>();
  for (const s of submissions) {
    submissionsByPrompt.set(s.promptId, (submissionsByPrompt.get(s.promptId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <span aria-hidden>✍️</span> {t.nav.writing}
        </h1>
        <p className="mt-1 text-slate-500">{t.writing.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {prompts.map((p) => {
          const count = submissionsByPrompt.get(p.id) ?? 0;
          return (
            <Link
              key={p.id}
              href={`/writing/${p.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {p.taskType.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-400">
                  {t.writing.minWords} {p.minWords} · {p.suggestedMinutes} {t.common.minutes}
                </span>
              </div>
              <h2 className="mt-3 font-semibold text-slate-900 group-hover:text-brand-700">
                {p.title}
              </h2>
              <p className="text-sm text-slate-500">{p.titleZh}</p>
              {count > 0 && (
                <p className="mt-3 text-xs font-medium text-green-600">
                  {t.writing.pastSubmissions}: {count}
                </p>
              )}
            </Link>
          );
        })}
      </div>
      {prompts.length === 0 && <p className="text-slate-500">{t.common.empty}</p>}
    </div>
  );
}
