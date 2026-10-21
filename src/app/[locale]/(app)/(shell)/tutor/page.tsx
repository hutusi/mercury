import { TutorChat } from "@/components/tutor/TutorChat";
import { isAiEnabled } from "@/lib/ai/client";
import { getChatPageData } from "@/lib/queries/chat";
import { getTierForUser } from "@/lib/queries/membership";
import { getLearnerProfile } from "@/lib/queries/profile";
import { requireOnboarded } from "@/lib/settings";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

/** A handed-over question (`?ask=` from a result or the notebook) is a prefill, not a message. */
const ASK_MAX_CHARS = 500;

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ ask?: string | string[] }>;
}) {
  const [{ user }, { ask }] = await Promise.all([requireOnboarded(), searchParams]);
  const [{ messages, remainingToday, dailyLimit }, tier, profile] = await Promise.all([
    getChatPageData(user.id),
    getTierForUser(user.id),
    getLearnerProfile(user.id),
  ]);
  const memoNote =
    [...(profile?.coachMemo.issues ?? [])].sort((a, b) =>
      b.lastSeenAt.localeCompare(a.lastSeenAt),
    )[0]?.noteZh ?? null;
  const initialDraft = (typeof ask === "string" ? ask : "").trim().slice(0, ASK_MAX_CHARS);

  return (
    <TutorChat
      enabled={isAiEnabled()}
      remainingToday={remainingToday}
      dailyLimit={dailyLimit}
      memoNote={memoNote}
      initialDraft={initialDraft}
      showPremiumCta={tier !== "premium"}
      initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
    />
  );
}
