import { TutorChat } from "@/components/tutor/TutorChat";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { isAiEnabled } from "@/lib/ai/client";
import { getDict } from "@/lib/i18n";
import { getChatPageData } from "@/lib/queries/chat";
import { getTierForUser } from "@/lib/queries/membership";
import { requireOnboarded } from "@/lib/settings";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

export default async function TutorPage() {
  const { user } = await requireOnboarded();
  const t = await getDict();
  const [{ messages, remainingToday, dailyLimit }, tier] = await Promise.all([
    getChatPageData(user.id),
    getTierForUser(user.id),
  ]);

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.tutor}
        ipa={t.entry.tutorIpa}
        pos={t.entry.tutorPos}
        gloss={t.tutor.subtitle}
      />
      <TutorChat
        enabled={isAiEnabled()}
        remainingToday={remainingToday}
        dailyLimit={dailyLimit}
        showPremiumCta={tier !== "premium"}
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
      />
    </div>
  );
}
