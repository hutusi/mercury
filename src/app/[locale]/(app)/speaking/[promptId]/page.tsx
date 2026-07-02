import { ArrowLeft } from "lucide-react";
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
        <Link
          href="/speaking"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.speaking}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{prompt.title}</h1>
        <p className="text-muted-foreground">{prompt.titleZh}</p>
      </div>

      <div className="border-y border-border py-6">
        <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-foreground/90">
          {prompt.promptEn}
        </p>
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
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
