"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export function SignOutButton({ label }: { label?: string }) {
  const t = useT();
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
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={pending}
      title={failed ? t.common.signOutFailed : undefined}
      className={failed ? "border-destructive/40 text-destructive" : undefined}
    >
      {label ?? t.common.signOut}
    </Button>
  );
}
