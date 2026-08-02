"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/**
 * Masked input with a reveal toggle — the typo guard on every password field
 * (register, login, change, reset). Deliberately no confirm-password twin:
 * seeing what you typed catches more mistakes than typing it blind twice,
 * and the reset flow covers the rest.
 */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const t = useT();
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-9", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
        className="absolute top-0 right-0 flex h-8 w-9 items-center justify-center text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span aria-hidden>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </span>
      </button>
    </div>
  );
}

export { PasswordInput };
