import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { isEmailEnabled } from "@/lib/email/enabled";

export default function ForgotPasswordPage() {
  // Keyless: reset emails can't be sent, so the page is absent — the
  // login page hides its link for the same reason.
  if (!isEmailEnabled(process.env)) notFound();
  return <ForgotPasswordForm />;
}
