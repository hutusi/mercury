"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export default function RegisterPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setError(error.message ?? t.auth.genericError);
      setPending(false);
      return;
    }
    router.push(localePath(locale, "/dashboard"));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t.auth.registerTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.auth.registerSubtitle}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.auth.name}</Label>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">
            {t.auth.password} · {t.auth.passwordHint}
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.auth.signingUp : t.auth.signUp}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t.auth.loginLink}
        </Link>
      </p>
    </div>
  );
}
