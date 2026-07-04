import { headers } from "next/headers";
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
