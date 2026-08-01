import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { localeRedirect } from "../i18n";
import { auth } from "./auth";

/** Authoritative session lookup (hits Postgres). Deduped per request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Guard for server actions and protected pages. Layout gates do NOT protect
 * server actions, so every action must call this itself and take the user id
 * from the session — never from client input.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) return localeRedirect("/login");
  return session.user;
}

/**
 * Guard for the admin surface (pages AND server actions — same rule as
 * requireUser). Signed-out users get the usual login redirect; signed-in
 * non-admins get a 404 so the admin surface is never advertised. `role` is
 * nullable (null means the plugin's defaultRole "user"), so compare, never
 * assume non-null.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) return localeRedirect("/login");
  if (session.user.role !== "admin") notFound();
  return session.user;
}
