import { MembershipControls } from "@/components/admin/MembershipControls";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { resolveTier } from "@/lib/membership-core";
import { ADMIN_USER_LIST_LIMIT, listUsersWithMembership } from "@/lib/queries/admin";

export default async function AdminPage() {
  await requireAdmin();
  const [t, rows] = await Promise.all([getDict(), listUsersWithMembership()]);
  const now = new Date();

  return (
    <div className="space-y-10">
      <EntryHeader
        title={t.nav.admin}
        ipa={t.entry.adminIpa}
        pos={t.entry.adminPos}
        gloss={t.admin.subtitle}
      />

      <section>
        <SectionLabel as="h2" className="mb-4">
          {t.admin.usersSection}
        </SectionLabel>
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">{t.admin.colName}</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">{t.admin.colEmail}</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">{t.admin.colRole}</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">{t.admin.colTier}</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">{t.admin.colExpiry}</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  {t.admin.colActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tier = resolveTier(
                  row.membershipTier
                    ? { tier: "premium", expiresAt: row.membershipExpiresAt }
                    : null,
                  now,
                );
                return (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="max-w-40 truncate px-3 py-2">{row.name}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-muted-foreground">
                      {row.email}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={row.role === "admin" ? "accent" : "outline"}>
                        {row.role === "admin" ? t.admin.roleAdmin : t.admin.roleUser}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={tier === "premium" ? "accent" : "outline"}>
                        {tier === "premium" ? t.admin.tierPremium : t.admin.tierFree}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {tier === "premium"
                        ? (row.membershipExpiresAt?.toISOString().slice(0, 10) ?? t.admin.noExpiry)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <MembershipControls userId={row.id} tier={tier} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length >= ADMIN_USER_LIST_LIMIT ? (
          <p className="mt-2 text-xs text-muted-foreground">{t.admin.capNote}</p>
        ) : null}
      </section>
    </div>
  );
}
