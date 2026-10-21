import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { InterestButton } from "@/components/premium/InterestButton";
import { getDict } from "@/lib/i18n";
import { entitlementsForTier, resolveTier } from "@/lib/membership-core";
import { getMembershipForUser, hasPremiumInterest } from "@/lib/queries/membership";
import { requireOnboarded } from "@/lib/settings";

export default async function PremiumPage() {
  const [{ user }, t] = await Promise.all([requireOnboarded(), getDict()]);
  const [membership, interested] = await Promise.all([
    getMembershipForUser(user.id),
    hasPremiumInterest(user.id),
  ]);
  const tier = resolveTier(membership ?? null);

  // 当前 must reflect the resolved tier — a premium member's current limits
  // ARE the premium ones.
  const current = entitlementsForTier(tier);
  const premium = entitlementsForTier("premium");
  const rows: { label: string; current: string | number; premium: string | number }[] = [
    {
      label: t.premium.chatLimitLabel,
      current: current.chatDailyLimit,
      premium: premium.chatDailyLimit,
    },
    {
      label: t.premium.gradingLimitLabel,
      current: current.aiGradingDailyLimit,
      premium: premium.aiGradingDailyLimit,
    },
    // The first hard gate (ADR 0030): free shows "—", not a number — the tier
    // is the entitlement, the cap only bounds premium usage.
    {
      label: t.premium.bookChatLabel,
      current: current.bookChatEnabled ? current.bookChatDailyLimit : t.premium.notIncluded,
      premium: premium.bookChatDailyLimit,
    },
  ];

  return (
    <div className="mx-auto flex max-w-[45rem] flex-col gap-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.settings}
        </Link>
        <EntryHeader
          className="mt-4"
          title={t.settings.membershipPremium}
          ipa={t.entry.premiumIpa}
          pos={t.entry.premiumPos}
          gloss={t.premium.gloss}
        />
      </div>

      <section className="flex flex-col gap-3">
        <SectionLabel as="h2">{t.premium.limitsSection}</SectionLabel>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <td className="px-5 py-3" />
                <th
                  scope="col"
                  className="px-4 py-3 text-[0.8125rem] font-medium text-muted-foreground"
                >
                  {t.premium.currentLabel}
                </th>
                <th
                  scope="col"
                  className="bg-brand-soft px-4 py-3 text-[0.8125rem] font-semibold text-brand-ink"
                >
                  {t.settings.membershipPremium}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-5 py-3.5 text-left font-normal">
                    {row.label}
                  </th>
                  <td className="px-4 py-3.5 text-muted-foreground tabular-nums">{row.current}</td>
                  <td className="bg-brand-soft/50 px-4 py-3.5 font-semibold tabular-nums">
                    {row.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col items-start gap-3">
        {tier === "premium" ? (
          <Badge variant="accent">{t.premium.alreadyPremium}</Badge>
        ) : (
          <>
            <p className="text-sm text-soft-3">{t.premium.comingSoon}</p>
            <InterestButton initialInterested={interested} />
          </>
        )}
      </section>
    </div>
  );
}
