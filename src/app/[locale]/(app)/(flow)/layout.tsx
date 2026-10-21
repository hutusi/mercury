import { SkipLink } from "@/components/layout/SkipLink";
import { getDict } from "@/lib/i18n";

/**
 * Learning sessions: no navigation chrome. Each session page renders its own
 * FlowHeader (exit, route progress, counter), so the frame only provides the
 * skip link, the main landmark, and the --chrome-top offset sticky elements
 * use to clear the 62px session bar.
 */
export default async function FlowLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getDict();
  return (
    <div className="min-h-dvh bg-background [--chrome-top:3.875rem]">
      <SkipLink label={t.a11y.skipToContent} />
      <main id="main-content">{children}</main>
    </div>
  );
}
