"use client";

import { ChevronRight, Crown, LogOut, Moon, Settings, ShieldCheck, Target } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { clearAllDrafts } from "@/lib/drafts";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { fill } from "@/lib/i18n/fill";
import { localePath } from "@/lib/i18n/routing";
import type { ShellMetas } from "@/lib/queries/shell";
import { formatTargetScore } from "@/lib/target-score";
import { cn } from "@/lib/utils";

/**
 * The avatar menu: goal, theme (light / dark / system), settings, premium,
 * admin, sign out. The sidebar variant shows the name and goal beside the
 * avatar; the phone variant is the avatar alone in the top bar.
 */
export function ProfileMenu({
  name,
  isAdmin,
  metas,
  variant,
}: {
  name: string;
  isAdmin: boolean;
  metas: Promise<ShellMetas>;
  variant: "sidebar" | "compact";
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mounted-gate: the stored theme only exists client-side
    setMounted(true);
  }, []);

  function signOut() {
    startSignOut(async () => {
      const { error } = await authClient.signOut();
      if (error) return;
      // Shared devices: the next learner must not inherit unsent work.
      clearAllDrafts();
      router.push(localePath(locale, "/"));
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.menu.account}
        className={cn(
          "outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
          variant === "sidebar"
            ? "-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 text-left hover:bg-accent"
            : "rounded-full",
        )}
      >
        <Avatar name={name} className={variant === "compact" ? "size-10" : undefined} />
        {variant === "sidebar" ? (
          <span className="min-w-0 leading-snug">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <Suspense fallback={<span className="block h-4" />}>
              <GoalLine metas={metas} className="block truncate text-xs text-muted-foreground" />
            </Suspense>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
        className="w-72 max-w-[calc(100vw-1.5rem)]"
      >
        <DropdownMenuLabel className="px-3 pt-2 pb-2.5">
          <span className="block text-[0.9375rem] font-semibold text-foreground">{name}</span>
          <Suspense fallback={null}>
            <GoalLine
              metas={metas}
              withMinutes
              className="mt-0.5 block text-[0.8125rem] font-normal text-muted-foreground"
            />
          </Suspense>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Target className="text-muted-foreground" aria-hidden />
            <span className="flex-1">{t.menu.goal}</span>
            <ChevronRight className="text-muted-foreground" aria-hidden />
          </Link>
        </DropdownMenuItem>
        <div className="flex items-center gap-3 px-3 pt-2 pb-1 text-sm">
          <Moon className="size-4 text-muted-foreground" aria-hidden />
          <span>{t.menu.theme}</span>
        </div>
        <DropdownMenuRadioGroup
          value={mounted ? (theme ?? "system") : "system"}
          onValueChange={setTheme}
          aria-label={t.menu.theme}
          className="mx-2.5 mt-1 mb-2 grid grid-cols-3 gap-1 rounded-md bg-track p-1"
        >
          {(["light", "dark", "system"] as const).map((value) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="min-h-9 justify-center rounded-sm px-1 text-[0.8125rem] font-medium text-muted-foreground data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-tab [&>span:first-child]:hidden"
            >
              {value === "light"
                ? t.common.themeLight
                : value === "dark"
                  ? t.common.themeDark
                  : t.common.themeSystem}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="text-muted-foreground" aria-hidden />
            {t.nav.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/premium">
            <Crown className="text-muted-foreground" aria-hidden />
            {t.nav.premium}
          </Link>
        </DropdownMenuItem>
        {/* Server-decided (session role); the real gate is requireAdmin on the page. */}
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck className="text-muted-foreground" aria-hidden />
              {t.nav.admin}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            signOut();
          }}
          className="text-soft"
        >
          <LogOut aria-hidden />
          {t.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GoalLine({
  metas,
  withMinutes = false,
  className,
}: {
  metas: Promise<ShellMetas>;
  withMinutes?: boolean;
  className?: string;
}) {
  const t = useT();
  const { goalTrack, targetScore, dailyMinutes } = use(metas);
  if (!goalTrack) return null;
  const score = formatTargetScore(goalTrack, targetScore);
  const line = fill(t.menu.userMeta, {
    track: t.tracks[goalTrack],
    score: score ?? t.menu.noTarget,
  });
  return (
    <span className={className}>
      {line}
      {withMinutes ? ` · ${fill(t.menu.minutesPerDay, { m: dailyMinutes })}` : null}
    </span>
  );
}
