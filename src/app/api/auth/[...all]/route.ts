import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";
import { isEmailEnabled } from "@/lib/email/enabled";

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

/**
 * Soft verification (ADR 0028): explicit social linking is the one
 * verification-gated operation, and better-auth cannot enforce it — its
 * /link-social endpoint never checks the local user's emailVerified, and a
 * before-hook cannot either: hooks receive the ORIGINAL request context, so
 * the bearer() plugin's Authorization→cookie conversion is invisible to them
 * and bearer clients would sail past the gate (verified empirically). Gating
 * here instead uses auth.api.getSession, which runs the full dispatch
 * (bearer conversion included) — the same mechanism /api/v1 bearer auth rides.
 * Server-side auth.api.linkSocial calls would bypass this wrapper; we never
 * make any.
 */
function withVerifiedEmailForLink(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (isEmailEnabled(process.env) && new URL(req.url).pathname === "/api/auth/link-social") {
      const session = await auth.api.getSession({ headers: req.headers });
      // Session-less requests fall through to the endpoint's own 401.
      if (session && !session.user.emailVerified) {
        return Response.json(
          { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" },
          { status: 403 },
        );
      }
    }
    return handler(req);
  };
}

export const GET = withoutAdminApi(handlers.GET);
export const POST = withoutAdminApi(withVerifiedEmailForLink(handlers.POST));
