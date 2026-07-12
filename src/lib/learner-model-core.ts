import type { Track } from "../content/types";
import { sanitizeUntrusted } from "./ai/sanitize";

/**
 * Pure learner-model logic, kept free of DB imports so it can be unit-tested
 * under Bun with no database. The persisted shapes (skill estimates, coach
 * memo) live on learner_profiles; this module owns how they evolve.
 */

export const SELF_RATED_LEVELS = [
  "novice",
  "elementary",
  "intermediate",
  "upper",
  "advanced",
] as const;
export type SelfRatedLevel = (typeof SELF_RATED_LEVELS)[number];

export const SKILL_KEYS = ["listening", "reading", "writing", "speaking", "vocab"] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];

export type Confidence = "low" | "medium" | "high";

export interface SkillEstimate {
  /** 0–100 ability estimate for this skill. */
  estimate: number;
  confidence: Confidence;
  /** ISO timestamp of the last signal applied. */
  updatedAt: string;
}

export type SkillEstimates = Record<SkillKey, SkillEstimate>;

export interface MemoItem {
  /** Stable English slug chosen by the grader, e.g. "article-usage". */
  tag: string;
  noteZh: string;
  /** How many gradings have surfaced this tag. */
  count: number;
  lastSeenAt: string;
}

export interface CoachMemo {
  issues: MemoItem[];
  strengths: MemoItem[];
}

export interface MemoUpdate {
  issues: { tag: string; noteZh: string }[];
  strengths: { tag: string; noteZh: string }[];
}

export type SkillSignalSource = "exercise" | "exam" | "ai_feedback";

export interface SkillSignal {
  skill: SkillKey;
  /** Observed performance 0–100 (accuracy %, normalized AI score, …). */
  value: number;
  source: SkillSignalSource;
}

const LEVEL_SEEDS: Record<SelfRatedLevel, number> = {
  novice: 20,
  elementary: 35,
  intermediate: 50,
  upper: 65,
  advanced: 80,
};

/** Seed used when the learner skipped the self-rating. */
const UNRATED_SEED = 40;

/**
 * EWMA step per signal source: measured signals move the estimate more than a
 * single practice exercise, which is noisy.
 */
const SIGNAL_WEIGHTS: Record<SkillSignalSource, number> = {
  exam: 0.5,
  ai_feedback: 0.35,
  exercise: 0.25,
};

const MAX_MEMO_ISSUES = 8;
const MAX_MEMO_STRENGTHS = 5;
const MAX_MEMO_NOTE_CHARS = 120;

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function defaultSkillEstimates(level: SelfRatedLevel | null, now: Date): SkillEstimates {
  const estimate = level ? LEVEL_SEEDS[level] : UNRATED_SEED;
  const updatedAt = now.toISOString();
  const seed = (): SkillEstimate => ({ estimate, confidence: "low", updatedAt });
  return {
    listening: seed(),
    reading: seed(),
    writing: seed(),
    speaking: seed(),
    vocab: seed(),
  };
}

export function emptyCoachMemo(): CoachMemo {
  return { issues: [], strengths: [] };
}

/**
 * Fold one observed signal into the estimates. Exams and AI-graded rubric
 * scores are direct measurements, so they also raise confidence to "high";
 * a practice exercise raises it at most to "medium".
 */
export function applySkillSignal(
  current: SkillEstimates,
  signal: SkillSignal,
  now: Date,
): SkillEstimates {
  const prev = current[signal.skill];
  const k = SIGNAL_WEIGHTS[signal.source];
  const estimate = clampScore(prev.estimate + k * (clampScore(signal.value) - prev.estimate));
  const confidence: Confidence =
    signal.source === "exercise" ? (prev.confidence === "high" ? "high" : "medium") : "high";
  return {
    ...current,
    [signal.skill]: { estimate, confidence, updatedAt: now.toISOString() },
  };
}

/** Map an AI overall score onto the 0–100 estimate scale. */
export function normalizeAiScore(scale: "band9" | "pct100", overallScore: number): number {
  if (scale === "band9") return clampScore((overallScore * 100) / 9);
  return clampScore(overallScore);
}

function mergeMemoItems(
  items: MemoItem[],
  updates: { tag: string; noteZh: string }[],
  cap: number,
  now: Date,
): MemoItem[] {
  const merged = items.map((item) => ({ ...item }));
  const nowIso = now.toISOString();
  for (const update of updates) {
    const tag = update.tag.trim();
    if (!tag) continue;
    const noteZh = update.noteZh.slice(0, MAX_MEMO_NOTE_CHARS);
    const existing = merged.find((item) => item.tag === tag);
    if (existing) {
      existing.count += 1;
      existing.noteZh = noteZh;
      existing.lastSeenAt = nowIso;
    } else {
      merged.push({ tag, noteZh, count: 1, lastSeenAt: nowIso });
    }
  }
  // Evict the stalest entries once over the cap (lowest count as tiebreak).
  merged.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt) || b.count - a.count);
  return merged.slice(0, cap);
}

/**
 * Fold a grading call's memo update into the persisted memo. Matching is by
 * tag: a recurring issue bumps its count (the "上次你也犯了" signal) and
 * refreshes the note; caps keep the memo small enough to embed in prompts.
 */
export function mergeCoachMemo(memo: CoachMemo, update: MemoUpdate, now: Date): CoachMemo {
  return {
    issues: mergeMemoItems(memo.issues, update.issues, MAX_MEMO_ISSUES, now),
    strengths: mergeMemoItems(memo.strengths, update.strengths, MAX_MEMO_STRENGTHS, now),
  };
}

export interface LearnerContextInput {
  goalTrack: Track | null;
  activeTrack: Track;
  targetScore: number | null;
  examDate: string | null;
  selfRatedLevel: SelfRatedLevel | null;
  skillEstimates: SkillEstimates;
  coachMemo: CoachMemo;
  /** Most-recent-first rubric scores from prior AI-graded submissions. */
  recentCriteria: { name: string; score: number }[];
  today: Date;
}

/** Human-readable target, e.g. "TOEIC 800" / "IELTS 6.5". */
export function formatTarget(track: Track, targetScore: number): string | null {
  if (track === "toeic") return `TOEIC ${targetScore}`;
  if (track === "ielts") return `IELTS ${(targetScore / 10).toFixed(1)}`;
  return null;
}

function daysUntil(day: string, today: Date): number {
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Deterministic learner-profile block embedded in AI prompts (inside
 * <learner_profile> delimiters added by the caller). Memo notes and tags
 * originated from model output, so they are sanitized like any untrusted text.
 */
export function formatLearnerContext(input: LearnerContextInput): string {
  const lines: string[] = [];

  const goalApplies = input.goalTrack !== null && input.goalTrack === input.activeTrack;
  if (goalApplies && input.targetScore !== null) {
    const target = formatTarget(input.goalTrack as Track, input.targetScore);
    if (target) {
      const days = input.examDate ? daysUntil(input.examDate, input.today) : null;
      lines.push(
        days !== null && days >= 0
          ? `Target: ${target} (exam in ${days} days)`
          : `Target: ${target}`,
      );
    }
  }
  if (input.selfRatedLevel) lines.push(`Self-rated level: ${input.selfRatedLevel}`);

  const estimates = SKILL_KEYS.map(
    (key) =>
      `${key} ${input.skillEstimates[key].estimate} (${input.skillEstimates[key].confidence})`,
  );
  lines.push(`Skill estimates (0-100): ${estimates.join(", ")}`);

  if (input.coachMemo.issues.length > 0) {
    const issues = input.coachMemo.issues
      .slice(0, 5)
      .map(
        (i) => `${sanitizeUntrusted(i.tag)} — ${sanitizeUntrusted(i.noteZh)} (seen ${i.count}x)`,
      );
    lines.push(`Recurring issues: ${issues.join("; ")}`);
  }
  if (input.coachMemo.strengths.length > 0) {
    const strengths = input.coachMemo.strengths
      .slice(0, 3)
      .map((s) => `${sanitizeUntrusted(s.tag)} — ${sanitizeUntrusted(s.noteZh)}`);
    lines.push(`Strengths: ${strengths.join("; ")}`);
  }
  if (input.recentCriteria.length > 0) {
    const recent = input.recentCriteria
      .slice(0, 6)
      .map((c) => `${sanitizeUntrusted(c.name)} ${c.score}`);
    lines.push(`Recent rubric scores: ${recent.join(", ")}`);
  }
  return lines.join("\n");
}
