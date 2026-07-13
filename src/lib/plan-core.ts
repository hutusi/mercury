import type { Track } from "../content/types";
import { daysUntil, SKILL_KEYS, type SkillEstimates, type SkillKey } from "./learner-model-core";

/**
 * Pure daily-plan engine (今日计划): decides what the learner should do today
 * so they never have to browse the catalog. Deterministic and DB-free —
 * priorities are rules, not AI — so it is unit-testable, costs nothing, and
 * works keyless. Priority: due vocab → mistakes → weakest skill → writing/
 * speaking cadence → mock-exam checkpoint ramping toward the exam date.
 */

export type PlanItemKind =
  | "vocab_review"
  | "vocab_new"
  | "mistakes"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "mock_exam";

export type PlanReasonKey =
  | "dueVocab"
  | "newWords"
  | "clearMistakes"
  | "weakSkill"
  | "writingCadence"
  | "speakingCadence"
  | "examCheckpoint";

export interface PlanItem {
  kind: PlanItemKind;
  refId?: string;
  /** Unlocalized app path, e.g. "/reading/toeic-r-001". */
  href: string;
  estMinutes: number;
  reasonKey: PlanReasonKey;
}

export interface PlanInput {
  profile: {
    dailyMinutes: number;
    examDate: string | null;
    goalTrack: Track | null;
    skillEstimates: SkillEstimates;
  } | null;
  activeTrack: Track;
  dueCount: number;
  freshCount: number;
  activeMistakes: number;
  recent: {
    lastWritingAt: Date | null;
    lastSpeakingAt: Date | null;
    lastExamAt: Date | null;
  };
  available: {
    reading: { id: string; suggestedMinutes: number; attempted: boolean }[];
    listening: { id: string; attempted: boolean }[];
    writing: { id: string; suggestedMinutes: number } | null;
    speaking: { id: string } | null;
    examId: string | null;
  };
  today: Date;
}

const MAX_ITEMS = 5;
const CADENCE_DAYS = 3;
/** Mock-exam checkpoint spacing: every 3 days in the final month, else weekly. */
const EXAM_RAMP_DAYS = 28;
const DEFAULT_DAILY_MINUTES = 20;

function daysSince(date: Date | null, today: Date): number {
  if (!date) return Infinity;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const then = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((start.getTime() - then.getTime()) / 86_400_000);
}

/** Weakest-first practice order; ties break in a fixed, product-chosen order. */
export function practiceOrder(estimates: SkillEstimates | null): SkillKey[] {
  const tiebreak: SkillKey[] = ["reading", "listening", "writing", "speaking", "vocab"];
  if (!estimates) return tiebreak;
  return [...SKILL_KEYS].sort(
    (a, b) =>
      estimates[a].estimate - estimates[b].estimate || tiebreak.indexOf(a) - tiebreak.indexOf(b),
  );
}

export function buildDailyPlan(input: PlanInput): PlanItem[] {
  const dailyMinutes = input.profile?.dailyMinutes ?? DEFAULT_DAILY_MINUTES;
  const candidates: PlanItem[] = [];

  // 1. Vocab: due reviews first (retention decays fastest); new words when
  //    the queue is clear — this also guarantees fresh accounts get an item.
  if (input.dueCount > 0) {
    candidates.push({
      kind: "vocab_review",
      href: "/vocabulary/study",
      estMinutes: Math.min(Math.max(Math.ceil(input.dueCount * 0.5), 3), 15),
      reasonKey: "dueVocab",
    });
  } else if (input.freshCount > 0) {
    candidates.push({
      kind: "vocab_new",
      href: "/vocabulary/study",
      estMinutes: 10,
      reasonKey: "newWords",
    });
  }

  // 2. Error-driven learning: clear the mistakes notebook before new input.
  if (input.activeMistakes > 0) {
    candidates.push({
      kind: "mistakes",
      href: "/mistakes",
      estMinutes: Math.min(Math.max(input.activeMistakes, 3), 10),
      reasonKey: "clearMistakes",
    });
  }

  // 3. Skill practice, weakest first. Exercises are always eligible; writing
  //    and speaking join only on cadence (they cost real effort) but jump the
  //    queue when they are the weakest skill.
  const order = practiceOrder(input.profile?.skillEstimates ?? null);
  const writingDue = daysSince(input.recent.lastWritingAt, input.today) >= CADENCE_DAYS;
  const speakingDue = daysSince(input.recent.lastSpeakingAt, input.today) >= CADENCE_DAYS;

  for (const skill of order) {
    if (skill === "reading") {
      const pick = input.available.reading.find((e) => !e.attempted) ?? input.available.reading[0];
      if (pick) {
        candidates.push({
          kind: "reading",
          refId: pick.id,
          href: `/reading/${pick.id}`,
          estMinutes: pick.suggestedMinutes || 8,
          reasonKey: "weakSkill",
        });
      }
    } else if (skill === "listening") {
      const pick =
        input.available.listening.find((e) => !e.attempted) ?? input.available.listening[0];
      if (pick) {
        candidates.push({
          kind: "listening",
          refId: pick.id,
          href: `/listening/${pick.id}`,
          estMinutes: 8,
          reasonKey: "weakSkill",
        });
      }
    } else if (skill === "writing" && writingDue && input.available.writing) {
      candidates.push({
        kind: "writing",
        refId: input.available.writing.id,
        href: `/writing/${input.available.writing.id}`,
        estMinutes: input.available.writing.suggestedMinutes || 20,
        reasonKey: order[0] === "writing" ? "weakSkill" : "writingCadence",
      });
    } else if (skill === "speaking" && speakingDue && input.available.speaking) {
      candidates.push({
        kind: "speaking",
        refId: input.available.speaking.id,
        href: `/speaking/${input.available.speaking.id}`,
        estMinutes: 10,
        reasonKey: order[0] === "speaking" ? "weakSkill" : "speakingCadence",
      });
    }
    // "vocab" is already covered by step 1.
  }

  // Greedy fill: always take the first candidate, then add while under the
  // time budget. The last item may overshoot — plans round up, not down.
  const items: PlanItem[] = [];
  let spent = 0;
  for (const c of candidates) {
    if (items.length >= MAX_ITEMS) break;
    if (items.length > 0 && spent >= dailyMinutes) break;
    items.push(c);
    spent += c.estMinutes;
  }

  // 4. Exam checkpoint: appended outside the minutes budget (a 20-minute plan
  //    should still surface it) when the goal matches the active track and the
  //    spacing rule says it's time.
  const profile = input.profile;
  if (
    profile?.examDate &&
    profile.goalTrack === input.activeTrack &&
    input.activeTrack !== "business" &&
    input.available.examId &&
    items.length < MAX_ITEMS
  ) {
    const toExam = daysUntil(profile.examDate, input.today);
    const interval = toExam <= EXAM_RAMP_DAYS ? 3 : 7;
    if (toExam >= 0 && daysSince(input.recent.lastExamAt, input.today) >= interval) {
      items.push({
        kind: "mock_exam",
        refId: input.available.examId,
        href: `/exams/${input.available.examId}`,
        estMinutes: 30,
        reasonKey: "examCheckpoint",
      });
    }
  }

  return items;
}
