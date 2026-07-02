import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { speakingPrompts, speakingSubmissions } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

export default async function SpeakingListPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [prompts, submissions] = await Promise.all([
    db.query.speakingPrompts.findMany({
      where: eq(speakingPrompts.track, track),
      orderBy: speakingPrompts.id,
    }),
    db.query.speakingSubmissions.findMany({
      where: eq(speakingSubmissions.userId, user.id),
      orderBy: desc(speakingSubmissions.createdAt),
    }),
  ]);

  const countByPrompt = new Map<string, number>();
  for (const s of submissions) {
    countByPrompt.set(s.promptId, (countByPrompt.get(s.promptId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <span aria-hidden>🎤</span> {t.nav.speaking}
        </h1>
        <p className="mt-1 text-slate-500">{t.speaking.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {prompts.map((p) => {
          const count = countByPrompt.get(p.id) ?? 0;
          return (
            <Link
              key={p.id}
              href={`/speaking/${p.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {p.partType.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-400">
                  {p.prepSeconds > 0 && `${t.speaking.prep} ${p.prepSeconds}${t.common.seconds} · `}
                  {t.speaking.speak} {p.speakSeconds}
                  {t.common.seconds}
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
