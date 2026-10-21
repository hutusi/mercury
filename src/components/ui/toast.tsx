"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Immediate, non-blocking feedback: "stop 2 complete · 2 to go", "progress
 * saved", "1 mistake cleared", a tapped word's gloss. One toast at a time,
 * bottom-centre (lifted above the phone tab bar), announced politely.
 *
 * The provider lives in the (app) layout, which stays mounted across
 * shell ↔ flow navigations, so a toast raised right before router.push()
 * survives the route change. For hard navigations and server redirects,
 * flashToast() parks the message in sessionStorage and the next provider
 * mount shows it.
 */

const FLASH_KEY = "mercury.flash";
const DURATION_MS = 2800;

interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
}

const ToastContext = createContext<{ show: (title: string, detail?: string) => void } | null>(null);

/** Queue a toast for the next page load (hard navigation / redirect). */
export function flashToast(title: string, detail?: string): void {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ title, detail }));
  } catch {
    // Storage unavailable: the toast is a nicety, drop it.
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback((title: string, detail?: string) => {
    if (timer.current) clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ id: nextId.current, title, detail });
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), DURATION_MS);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      const { title, detail } = JSON.parse(raw) as { title?: unknown; detail?: unknown };
      if (typeof title === "string") show(title, typeof detail === "string" ? detail : undefined);
    } catch {
      // Ignore a corrupted flash entry.
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "pointer-events-none fixed left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-full bg-primary px-[1.125rem] py-3 text-sm leading-snug text-primary-foreground shadow-float transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
          "bottom-[calc(1.5rem+env(safe-area-inset-bottom)+var(--bottom-nav-h,0px))]",
          visible && toast ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        {toast ? (
          <>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-toast-dot" />
            <span>
              {toast.title}
              {toast.detail ? <span className="opacity-80"> · {toast.detail}</span> : null}
            </span>
          </>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast.show("进度已保存")` */
export function useToast(): { show: (title: string, detail?: string) => void } {
  const value = useContext(ToastContext);
  // Outside the (app) area (landing, auth) toasts degrade to a no-op.
  return value ?? { show: () => {} };
}
