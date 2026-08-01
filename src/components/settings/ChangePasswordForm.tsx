"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useT } from "@/lib/i18n/LocaleProvider";

export function ChangePasswordForm() {
  const t = useT();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [revoke, setRevoke] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Refresh runs in its own transition so a slow tree apply can't wedge the
  // form (same pattern as ReminderToggle; never revalidatePath in actions).
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revoke,
      });
      if (error) {
        if (error.code === "INVALID_PASSWORD") setError(t.settings.wrongPassword);
        else if (error.code === "SESSION_NOT_FRESH") setError(t.settings.sessionNotFresh);
        else if (error.code === "PASSWORD_TOO_SHORT") setError(t.auth.passwordHint);
        else setError(error.message ?? t.auth.genericError);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setSaved(true);
      startTransition(() => router.refresh());
    } catch {
      setError(t.auth.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium">{t.settings.changePasswordLabel}</p>
      <div className="space-y-1.5">
        <Label htmlFor="current-password">{t.settings.currentPassword}</Label>
        <Input
          id="current-password"
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">
          {t.auth.newPassword} · {t.auth.passwordHint}
        </Label>
        <Input
          id="new-password"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t.settings.revokeOtherSessions}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={revoke}
          onClick={() => setRevoke(!revoke)}
        >
          {revoke ? t.dashboard.reminderToggleOn : t.dashboard.reminderToggleOff}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          {t.settings.passwordChanged}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? t.settings.saving : t.settings.updatePassword}
      </Button>
    </form>
  );
}
