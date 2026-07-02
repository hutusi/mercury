import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { SpeakingRunner } from "@/components/speaking/SpeakingRunner";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { speakingPrompts } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";

export default async function SpeakingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  await requireUser();
  const { promptId } = await params;
  const t = await getDict();

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, promptId),
  });
  if (!prompt) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/speaking" className="text-sm font-medium text-brand-600 hover:underline">
          ← {t.nav.speaking}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{prompt.title}</h1>
        <p className="text-slate-500">{prompt.titleZh}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">
          {prompt.promptEn}
        </p>
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-relaxed whitespace-pre-line text-slate-500">
          {prompt.promptZh}
        </p>
      </div>

      <SpeakingRunner
        promptId={prompt.id}
        prepSeconds={prompt.prepSeconds}
        speakSeconds={prompt.speakSeconds}
        modelAnswer={prompt.modelAnswer}
        checklist={prompt.checklist}
      />
    </div>
  );
}
