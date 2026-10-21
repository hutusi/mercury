import type { TodayRoute } from "./queries/plan";

/**
 * The v1 plan body (docs/api/openapi.yaml). `items` keeps its pre-route
 * meaning — what is still left to do today — so clients that predate the
 * persistent route keep working; `stops` carries the whole day with status.
 */
export function planResponseBody(route: TodayRoute) {
  const items = route.stops
    .filter((s) => s.status === "current" || s.status === "open")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip derived fields
    .map(({ key, status, progress, started, ...item }) => item);
  return {
    items,
    stops: route.stops,
    summary: route.summary,
    dailyMinutes: route.dailyMinutes,
    generatedFor: route.day,
    revision: route.revision,
  };
}
