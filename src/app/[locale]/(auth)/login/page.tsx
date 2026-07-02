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

export default function LoginPage() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
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
        <h1 className="text-xl font-semibold">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.auth.signingIn : t.auth.signIn}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t.auth.registerLink}
        </Link>
      </p>
    </div>
  );
}
