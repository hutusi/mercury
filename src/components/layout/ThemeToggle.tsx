"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * One-tap light/dark switch for the public headers (landing, onboarding,
 * auth). Signed-in learners also get light / dark / system in the profile
 * menu.
 */
export function ThemeToggle() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  // The resolved theme is unknown during SSR: render a stable placeholder
  // until hydrated (same mounted gate as the speech components).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mounted-gate: the stored theme only exists client-side
    setMounted(true);
  }, []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t.menu.toggleTheme}
      title={t.menu.toggleTheme}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
