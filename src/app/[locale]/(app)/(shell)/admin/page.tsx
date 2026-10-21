import { MembershipCells } from "@/components/admin/MembershipCells";
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
    <div className="flex flex-col gap-8">
      <EntryHeader
        title={t.nav.admin}
        ipa={t.entry.adminIpa}
        pos={t.entry.adminPos}
        gloss={t.admin.subtitle}
      />

      <section className="flex flex-col gap-3">
        <SectionLabel as="h2">{t.admin.usersSection}</SectionLabel>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground">
                  {t.admin.colName}
                </th>
                <th className="px-4 py-3 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground">
                  {t.admin.colEmail}
                </th>
                <th className="px-4 py-3 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground">
                  {t.admin.colRole}
                </th>
                <th className="px-4 py-3 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground">
                  {t.admin.colTier}
                </th>
                <th className="px-4 py-3 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground">
                  {t.admin.colExpiry}
                </th>
                <th className="px-4 py-3 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground">
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
                const expiresAt = row.membershipExpiresAt?.toISOString().slice(0, 10) ?? null;
                return (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="max-w-40 truncate px-4 py-3">{row.name}</td>
                    <td className="max-w-56 truncate px-4 py-3 text-muted-foreground">
                      {row.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.role === "admin" ? "accent" : "default"}>
                        {row.role === "admin" ? t.admin.roleAdmin : t.admin.roleUser}
                      </Badge>
                    </td>
                    {/* Keyed by the server snapshot: refreshed data that differs
                        (another admin's edit, an elapsed expiry) remounts the
                        cells and displaces their local state. */}
                    <MembershipCells
                      key={`${tier}:${expiresAt ?? ""}`}
                      userId={row.id}
                      tier={tier}
                      expiresAt={expiresAt}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length >= ADMIN_USER_LIST_LIMIT ? (
          <p className="text-xs text-muted-foreground">{t.admin.capNote}</p>
        ) : null}
      </section>
    </div>
  );
}
