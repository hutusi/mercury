import { TutorChat } from "@/components/tutor/TutorChat";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { isAiEnabled } from "@/lib/ai/client";
import { getDict } from "@/lib/i18n";
import { getChatPageData } from "@/lib/queries/chat";
import { requireOnboarded } from "@/lib/settings";

export default async function TutorPage() {
  const { user } = await requireOnboarded();
  const t = await getDict();
  const { messages, remainingToday } = await getChatPageData(user.id);

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
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
      />
    </div>
  );
}
