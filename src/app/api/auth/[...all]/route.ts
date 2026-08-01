import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";

const handlers = toNextJsHandler(auth.handler);

/**
 * The admin() plugin exists only for the user.role column and typed session
 * (ADR 0025): roles change via `bun run admin:grant`, memberships via our
 * requireAdmin-gated server actions. Its HTTP surface (set-role, impersonate,
 * ban, remove-user, password reset, …) is deliberately unreachable — even for
 * admins, so a leaked admin token can't impersonate or delete users.
 */
function withoutAdminApi(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (new URL(req.url).pathname.startsWith("/api/auth/admin")) {
      return new Response("Not Found", { status: 404 });
    }
    return handler(req);
  };
}

export const GET = withoutAdminApi(handlers.GET);
export const POST = withoutAdminApi(handlers.POST);
