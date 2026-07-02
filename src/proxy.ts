import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only: checks that a session cookie exists, without
 * hitting the database. The authoritative check lives in the (app) layout
 * and in requireUser() inside every server action.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/vocabulary/:path*",
    "/reading/:path*",
    "/listening/:path*",
    "/writing/:path*",
    "/speaking/:path*",
    "/exams/:path*",
  ],
};
