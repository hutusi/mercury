"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export function SignOutButton({ label = "退出登录" }: { label?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    setFailed(false);
    startTransition(async () => {
      const { error } = await authClient.signOut();
      if (error) {
        setFailed(true);
        return;
      }
      router.push(localePath(locale, "/"));
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={pending}
      title={failed ? "Sign-out failed — try again" : undefined}
      className={`rounded-lg border bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-50 ${
        failed ? "border-red-300 text-red-600" : "border-slate-300 text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}
