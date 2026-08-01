import { Resend } from "resend";
import { emailFrom } from "./enabled";
import type { EmailContent } from "./templates";

// Lazy client: nothing is constructed at import time, so build and unit-test
// collection stay key-free (same contract as the pg Pool and the AI client).
let client: Resend | null = null;

// Never throws: a Resend outage must not 500 sign-up (the user still gets the
// check-inbox screen and a working resend button), and requestPasswordReset's
// constant-time "sent if registered" envelope must stay constant. Failures are
// logged server-side and reported as `false`.
export async function sendEmail({ to, subject, html, text }: EmailContent & { to: string }) {
  try {
    client ??= new Resend(process.env.RESEND_API_KEY);
    const { error } = await client.emails.send({
      from: emailFrom(process.env),
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("Failed to send email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}
