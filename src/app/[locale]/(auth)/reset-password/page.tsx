import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { isEmailEnabled } from "@/lib/email/enabled";

export default function ResetPasswordPage() {
  if (!isEmailEnabled(process.env)) notFound();
  return <ResetPasswordForm />;
}
