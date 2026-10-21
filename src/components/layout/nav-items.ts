import {
  BookMarked,
  BookOpenText,
  Headphones,
  LayoutGrid,
  LibraryBig,
  MessageCircle,
  Mic,
  NotebookPen,
  PenLine,
  Sun,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { SkillKey } from "@/lib/learner-model-core";

export type NavKey =
  | "dashboard"
  | "practice"
  | "tutor"
  | "mistakes"
  | "vocabulary"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "books"
  | "exams";

export interface NavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  /** The learner-model skill this hub practises (for the "weak" meta). */
  skill?: SkillKey;
}

/** The four destinations: sidebar main items and the phone tab bar. */
export const MAIN_NAV: readonly NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: Sun },
  { key: "practice", href: "/practice", icon: LayoutGrid },
  { key: "tutor", href: "/tutor", icon: MessageCircle },
  { key: "mistakes", href: "/mistakes", icon: NotebookPen },
];

/** Skill hubs, nested under Practice in the sidebar. */
export const PRACTICE_NAV: readonly NavItem[] = [
  { key: "vocabulary", href: "/vocabulary", icon: BookMarked, skill: "vocab" },
  { key: "reading", href: "/reading", icon: BookOpenText, skill: "reading" },
  { key: "listening", href: "/listening", icon: Headphones, skill: "listening" },
  { key: "writing", href: "/writing", icon: PenLine, skill: "writing" },
  { key: "speaking", href: "/speaking", icon: Mic, skill: "speaking" },
  { key: "books", href: "/books", icon: LibraryBig },
  { key: "exams", href: "/exams", icon: Timer },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The phone tab that owns a path: skill hubs belong to Practice. */
export function activeMainKey(pathname: string): NavKey | null {
  const main = MAIN_NAV.find((item) => isActivePath(pathname, item.href));
  if (main) return main.key;
  return PRACTICE_NAV.some((item) => isActivePath(pathname, item.href)) ? "practice" : null;
}
