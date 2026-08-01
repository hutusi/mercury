import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { VerifyEmailError } from "@/components/auth/VerifyEmailError";
import { auth } from "@/lib/auth/auth";
import { isEmailEnabled } from "@/lib/email/enabled";
import { localeRedirect } from "@/lib/i18n";

// Landing target for verification links (better-auth redirects here on both
// success and failure). It must be a dedicated PUBLIC page: pointing the
// callbackURL at /dashboard breaks the error case — the proxy bounces the
// session-less request to /login and drops the ?error= query string.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Keyless: the whole email-auth surface is absent, like AI/social.
  if (!isEmailEnabled(process.env)) notFound();
  const { error } = await searchParams;
  if (!error) {
    // autoSignInAfterVerification set the session cookie before redirecting;
    // an already-verified link arrives session-less and goes to login.
    const session = await auth.api.getSession({ headers: await headers() });
    return localeRedirect(session ? "/dashboard" : "/login?verified=1");
  }
  return <VerifyEmailError code={error} />;
}
