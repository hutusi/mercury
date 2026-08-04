import { Badge } from "@/components/ui/badge";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { InterestButton } from "@/components/premium/InterestButton";
import { getDict } from "@/lib/i18n";
import { entitlementsForTier } from "@/lib/membership-core";
import { getMembershipForUser, hasPremiumInterest } from "@/lib/queries/membership";
import { resolveTier } from "@/lib/membership-core";
import { requireOnboarded } from "@/lib/settings";

export default async function PremiumPage() {
  const { user } = await requireOnboarded();
  const t = await getDict();
  const [membership, interested] = await Promise.all([
    getMembershipForUser(user.id),
    hasPremiumInterest(user.id),
  ]);
  const tier = resolveTier(membership ?? null);

  const free = entitlementsForTier("free");
  const premium = entitlementsForTier("premium");
  const rows = [
    {
      label: t.premium.chatLimitLabel,
      free: free.chatDailyLimit,
      premium: premium.chatDailyLimit,
    },
    {
      label: t.premium.gradingLimitLabel,
      free: free.aiGradingDailyLimit,
      premium: premium.aiGradingDailyLimit,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <EntryHeader
        title={t.settings.membershipPremium}
        ipa={t.entry.premiumIpa}
        pos={t.entry.premiumPos}
        gloss={t.premium.gloss}
      />

      <section>
        <SectionLabel as="h2" className="mb-3">
          {t.premium.limitsSection}
        </SectionLabel>
        <table className="w-full border-y border-border text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2.5 pr-4 font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase" />
              <th className="px-4 py-2.5 font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase">
                {t.admin.tierFree}
              </th>
              <th className="px-4 py-2.5 font-mono text-2xs font-medium tracking-label text-cinnabar uppercase">
                {t.settings.membershipPremium}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-3 pr-4">{row.label}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground tabular-nums">
                  {row.free} / {t.premium.perDay}
                </td>
                <td className="px-4 py-3 font-mono font-medium tabular-nums">
                  {row.premium} / {t.premium.perDay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        {tier === "premium" ? (
          <Badge variant="accent">{t.premium.alreadyPremium}</Badge>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t.premium.comingSoon}</p>
            <InterestButton initialInterested={interested} />
          </>
        )}
      </section>
    </div>
  );
}
