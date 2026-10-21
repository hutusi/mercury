import type { SegmentTone } from "@/components/ui/segmented-progress";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import type { FlowContext } from "@/lib/queries/plan";
import { FlowHeaderBar } from "./FlowHeaderBar";

const TONE: Record<string, SegmentTone> = {
  done: "done",
  current: "current",
  skipped: "skipped",
  open: "open",
};

/**
 * Server half of the session bar: resolves the plan position into words and
 * route segments. In plan mode the exit returns to Today; in free practice it
 * returns to the hub the session came from.
 */
export async function FlowHeader({
  context,
  hubHref,
  confirmMessage,
}: {
  context: FlowContext;
  hubHref: string;
  confirmMessage?: string;
}) {
  const t = await getDict();
  if (context.mode === "free") {
    return (
      <FlowHeaderBar
        label={t.flow.free}
        segments={null}
        exitHref={hubHref}
        confirmMessage={confirmMessage}
      />
    );
  }
  return (
    <FlowHeaderBar
      label={fill(t.flow.stop, { i: context.index + 1, n: context.total })}
      segments={context.segments.map((s) => ({ weight: s.weight, tone: TONE[s.status] }))}
      exitHref="/dashboard"
      confirmMessage={confirmMessage}
    />
  );
}
