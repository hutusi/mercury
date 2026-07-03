import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";

/**
 * 404 for authenticated routes — reached by `notFound()` on a bad exercise /
 * exam / submission id. Renders inside the AppShell and is localized.
 */
export default async function AppNotFound() {
  const t = await getDict();
  return (
    <div className="space-y-6">
      <EntryHeader title={t.errors.notFoundTitle} gloss={t.errors.notFoundBody} />
      <Button asChild>
        <Link href="/dashboard">{t.errors.goHome}</Link>
      </Button>
    </div>
  );
}
