import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, isLocale, splitLocalePath } from "@/lib/i18n/routing";

const PROTECTED = [
  "/dashboard",
  "/onboarding",
  "/vocabulary",
  "/reading",
  "/listening",
  "/writing",
  "/speaking",
  "/exams",
];

function isProtected(rest: string): boolean {
  return PROTECTED.some((p) => rest === p || rest.startsWith(`${p}/`));
}

/**
 * Three jobs, all optimistic (no DB): 307 unprefixed paths to the preferred
 * locale, gate protected paths on the presence of a session cookie (the
 * authoritative check lives in the (app) layout and in requireUser() inside
 * every server action), and keep the locale cookie synced to the URL segment
 * so getLocale() stays correct everywhere — including server actions, which
 * POST to the prefixed page URL and pass through here.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, rest } = splitLocalePath(pathname);

  if (!locale) {
    const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
    const preferred = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
    return NextResponse.redirect(new URL(`/${preferred}${pathname}${search}`, request.url));
  }

  if (isProtected(rest) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    // Mutate the request cookie too so cookies() sees the URL's locale during
    // THIS render, not only on the next request.
    request.cookies.set(LOCALE_COOKIE, locale);
    const response = NextResponse.next({ request });
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
